import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Resolves the WebSocket URL based on environment or window.location
 */
export function getWebSocketUrl(sessionId, token) {
    if (typeof window === 'undefined') return '';

    let wsBase = import.meta.env?.VITE_WS_URL;
    if (!wsBase) {
        const apiBase = import.meta.env?.VITE_API_URL;
        if (apiBase) {
            try {
                const u = new URL(apiBase);
                const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
                wsBase = `${protocol}//${u.host}/ws/interview`;
            } catch {}
        }
    }

    if (!wsBase) {
        const loc = window.location;
        if (loc.port === '5173') {
            wsBase = 'ws://localhost:5000/ws/interview';
        } else {
            const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
            wsBase = `${protocol}//${loc.host}/ws/interview`;
        }
    }

    const t = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : '') || '';
    const sid = sessionId || '';
    return `${wsBase}?token=${encodeURIComponent(t)}&sessionId=${encodeURIComponent(sid)}`;
}

/**
 * useInterviewSocket: Persistent WebSocket hook with exponential backoff reconnection,
 * outbound message helpers, and inbound real-time event dispatching.
 */
export function useInterviewSocket({
    sessionId,
    token,
    onTextToken,
    onAudioChunk,
    onAiInterrupted,
    onAiCodeComment,
    onCriUpdate,
    onStageTransition,
    onError,
    autoConnect = true,
    maxReconnectAttempts = 6
} = {}) {
    // Lifecycle state: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
    const [connectionState, setConnectionState] = useState('disconnected');
    const [lastError, setLastError] = useState(null);
    const [latestToken, setLatestToken] = useState('');
    const [streamingText, setStreamingText] = useState('');
    const [cri, setCri] = useState(null);
    const [criSignal, setCriSignal] = useState(null);
    const [latestCodeComment, setLatestCodeComment] = useState(null);

    const wsRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimerRef = useRef(null);
    const isManualCloseRef = useRef(false);
    const connectRef = useRef(null);

    // Callbacks refs to avoid stale closures
    const onTextTokenRef = useRef(onTextToken);
    const onAudioChunkRef = useRef(onAudioChunk);
    const onAiInterruptedRef = useRef(onAiInterrupted);
    const onAiCodeCommentRef = useRef(onAiCodeComment);
    const onCriUpdateRef = useRef(onCriUpdate);
    const onStageTransitionRef = useRef(onStageTransition);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onTextTokenRef.current = onTextToken;
        onAudioChunkRef.current = onAudioChunk;
        onAiInterruptedRef.current = onAiInterrupted;
        onAiCodeCommentRef.current = onAiCodeComment;
        onCriUpdateRef.current = onCriUpdate;
        onStageTransitionRef.current = onStageTransition;
        onErrorRef.current = onError;
    }, [onTextToken, onAudioChunk, onAiInterrupted, onAiCodeComment, onCriUpdate, onStageTransition, onError]);

    const clearReconnectTimer = () => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    };

    /**
     * Send raw JSON object over WebSocket
     */
    const sendMessage = useCallback((payload) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn('[useInterviewSocket] Socket not open, message dropped:', payload?.type);
            return false;
        }
        try {
            wsRef.current.send(JSON.stringify(payload));
            return true;
        } catch (err) {
            console.error('[useInterviewSocket] Send error:', err);
            return false;
        }
    }, []);

    // Outbound senders
    const sendTextMessage = useCallback((text) => {
        setStreamingText('');
        return sendMessage({ type: 'TEXT_MESSAGE', text });
    }, [sendMessage]);

    const sendAudioChunk = useCallback((base64Data, sampleRate = 16000) => {
        return sendMessage({ type: 'AUDIO_CHUNK', data: base64Data, sampleRate });
    }, [sendMessage]);

    const sendCodeSnapshot = useCallback((code, language) => {
        return sendMessage({ type: 'CODE_SNAPSHOT', code, language });
    }, [sendMessage]);

    const sendInterrupt = useCallback(() => {
        return sendMessage({ type: 'INTERRUPT' });
    }, [sendMessage]);

    const sendSilenceTimeout = useCallback(() => {
        return sendMessage({ type: 'SILENCE_TIMEOUT' });
    }, [sendMessage]);

    const sendProctoringEvent = useCallback((eventType, details) => {
        return sendMessage({ type: 'PROCTORING_EVENT', eventType, details });
    }, [sendMessage]);

    /**
     * Connect or initiate WebSocket connection
     */
    const connect = useCallback(() => {
        if (!sessionId) return;

        const effectiveToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null);
        if (!effectiveToken) {
            setLastError('No access token available for WebSocket connection');
            setConnectionState('disconnected');
            return;
        }

        clearReconnectTimer();
        isManualCloseRef.current = false;

        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        setConnectionState(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');

        const wsUrl = getWebSocketUrl(sessionId, effectiveToken);
        let ws;
        try {
            ws = new WebSocket(wsUrl);
        } catch (err) {
            setLastError(err.message);
            setConnectionState('disconnected');
            return;
        }

        wsRef.current = ws;

        ws.onopen = () => {
            setConnectionState('connected');
            setLastError(null);
            reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch {
                console.warn('[useInterviewSocket] Received non-JSON WebSocket frame:', event.data);
                return;
            }

            switch (msg.type) {
                case 'SESSION_READY':
                    setConnectionState('connected');
                    break;

                case 'TEXT_TOKEN':
                    setLatestToken(msg.token);
                    setStreamingText((prev) => prev + msg.token);
                    if (onTextTokenRef.current) {
                        onTextTokenRef.current(msg.token, msg);
                    }
                    break;

                case 'AUDIO_CHUNK':
                    if (onAudioChunkRef.current) {
                        onAudioChunkRef.current(msg.audioBase64 || msg.data, msg);
                    }
                    break;

                case 'AI_INTERRUPTED':
                    setStreamingText('');
                    if (onAiInterruptedRef.current) {
                        onAiInterruptedRef.current(msg);
                    }
                    break;

                case 'AI_CODE_COMMENT':
                    setLatestCodeComment(msg.text);
                    if (onAiCodeCommentRef.current) {
                        onAiCodeCommentRef.current(msg.text, msg);
                    }
                    break;

                case 'CRI_UPDATE':
                    if (typeof msg.cri === 'number') {
                        setCri(msg.cri);
                    }
                    if (msg.signal) {
                        setCriSignal(msg.signal);
                    }
                    if (onCriUpdateRef.current) {
                        onCriUpdateRef.current(msg.cri, msg.signal, msg);
                    }
                    break;

                case 'STAGE_TRANSITION':
                    if (onStageTransitionRef.current) {
                        onStageTransitionRef.current(msg.stage, msg.codingChallenge, msg);
                    }
                    break;

                case 'ERROR':
                    setLastError(msg.message || 'Unknown WebSocket error');
                    if (onErrorRef.current) {
                        onErrorRef.current(msg.message, msg);
                    }
                    break;

                default:
                    break;
            }
        };

        ws.onerror = (err) => {
            console.warn('[useInterviewSocket] WebSocket error occurred:', err);
            setLastError('WebSocket connection encounter an error');
        };

        ws.onclose = (event) => {
            wsRef.current = null;

            // Terminal close codes: 4001 (Unauthorized), 4003 (Session not found), 4004 (Completed), 1000 (Normal)
            const isTerminalCode = [1000, 4001, 4003, 4004].includes(event.code);

            if (isManualCloseRef.current || isTerminalCode) {
                setConnectionState('disconnected');
                return;
            }

            // Exponential backoff reconnect
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                setConnectionState('reconnecting');
                const delay = Math.min(30000, 1000 * Math.pow(1.5, reconnectAttemptsRef.current));
                reconnectAttemptsRef.current++;
                reconnectTimerRef.current = setTimeout(() => {
                    connectRef.current?.();
                }, delay);
            } else {
                setConnectionState('disconnected');
                setLastError('Maximum reconnection attempts reached');
            }
        };
    }, [sessionId, token, maxReconnectAttempts]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const disconnect = useCallback(() => {
        isManualCloseRef.current = true;
        clearReconnectTimer();
        if (wsRef.current) {
            try {
                wsRef.current.close(1000, 'Client disconnected');
            } catch {}
            wsRef.current = null;
        }
        setConnectionState('disconnected');
    }, []);

    useEffect(() => {
        if (autoConnect && sessionId) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [autoConnect, sessionId, connect, disconnect]);

    return {
        connectionState,
        isConnected: connectionState === 'connected',
        lastError,
        latestToken,
        streamingText,
        cri,
        criSignal,
        latestCodeComment,
        sendTextMessage,
        sendAudioChunk,
        sendCodeSnapshot,
        sendInterrupt,
        sendSilenceTimeout,
        sendProctoringEvent,
        sendMessage,
        connect,
        disconnect
    };
}

export default useInterviewSocket;
