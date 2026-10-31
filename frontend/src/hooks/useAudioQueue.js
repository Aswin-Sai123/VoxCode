import { useState, useRef, useEffect, useCallback } from 'react';
import { base64ToArrayBuffer } from '../utils/audioCapture';

/**
 * Fallback raw PCM 16-bit decoder to AudioBuffer
 */
function decodePCMToAudioBuffer(arrayBuffer, audioContext, sampleRate = 16000, numChannels = 1) {
    const view = new DataView(arrayBuffer);
    const numSamples = Math.floor(arrayBuffer.byteLength / (2 * numChannels));
    const audioBuffer = audioContext.createBuffer(numChannels, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
        const int16 = view.getInt16(i * 2, true);
        channelData[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
    }
    return audioBuffer;
}

/**
 * useAudioQueue: Web Audio playback queue with sample-accurate scheduling,
 * base64 decoding (MP3/WAV/PCM), AnalyserNode integration, and instantaneous queue flush.
 */
export function useAudioQueue() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [analyser, setAnalyser] = useState(null);
    const [audioContext, setAudioContext] = useState(null);

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const gainNodeRef = useRef(null);
    const activeSourcesRef = useRef([]);
    const pendingQueueRef = useRef([]);
    const nextStartTimeRef = useRef(0);
    const isProcessingRef = useRef(false);
    const chunkCounterRef = useRef(0);

    // Initialize Web Audio Context and AnalyserNode
    const getOrCreateAudioContext = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            const AudioCtx = typeof window !== 'undefined'
                ? (window.AudioContext || window.webkitAudioContext)
                : null;

            if (!AudioCtx) return null;

            const ctx = new AudioCtx();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;

            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;

            analyser.connect(gainNode);
            gainNode.connect(ctx.destination);

            audioContextRef.current = ctx;
            analyserRef.current = analyser;
            gainNodeRef.current = gainNode;

            setAudioContext(ctx);
            setAnalyser(analyser);
        }

        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => {});
        }

        return audioContextRef.current;
    }, []);

    /**
     * Decode a base64 audio payload (MP3, WAV, or PCM) into an AudioBuffer
     */
    const decodeChunk = useCallback(async (base64Data, ctx) => {
        if (!base64Data || typeof base64Data !== 'string') return null;

        const cleanBase64 = base64Data.replace(/^data:audio\/[a-z0-9]+;base64,/i, '').trim();
        if (!cleanBase64) return null;

        const arrayBuffer = base64ToArrayBuffer(cleanBase64);

        try {
            // First attempt native decodeAudioData (supports MP3, WAV, AAC, etc.)
            return await ctx.decodeAudioData(arrayBuffer.slice(0));
        } catch {
            // If native decoding fails, try raw 16kHz PCM fallback
            try {
                return decodePCMToAudioBuffer(arrayBuffer, ctx, 16000, 1);
            } catch (pcmErr) {
                console.warn('[useAudioQueue] Failed to decode audio chunk:', pcmErr);
                return null;
            }
        }
    }, []);

    /**
     * Schedules playback of decoded buffers sequentially with sample accuracy
     */
    const scheduleNextBuffers = useCallback(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        const ctx = getOrCreateAudioContext();
        if (!ctx) {
            isProcessingRef.current = false;
            return;
        }

        while (pendingQueueRef.current.length > 0) {
            const item = pendingQueueRef.current.shift();
            const audioBuffer = await decodeChunk(item.base64, ctx);

            if (!audioBuffer) continue;

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;

            // Connect to AnalyserNode
            if (analyserRef.current) {
                source.connect(analyserRef.current);
            } else {
                source.connect(ctx.destination);
            }

            // Sample-accurate timing
            const currentTime = ctx.currentTime;
            const startTime = Math.max(currentTime, nextStartTimeRef.current);
            source.start(startTime);

            nextStartTimeRef.current = startTime + audioBuffer.duration;
            activeSourcesRef.current.push(source);
            setIsPlaying(true);
            setCurrentChunkIndex(item.index);

            source.onended = () => {
                const idx = activeSourcesRef.current.indexOf(source);
                if (idx !== -1) {
                    activeSourcesRef.current.splice(idx, 1);
                }
                if (activeSourcesRef.current.length === 0 && pendingQueueRef.current.length === 0) {
                    setIsPlaying(false);
                    nextStartTimeRef.current = 0;
                }
            };
        }

        isProcessingRef.current = false;
    }, [decodeChunk, getOrCreateAudioContext]);

    /**
     * Enqueues an incoming audio chunk (base64 string or chunk object)
     */
    const queueAudioChunk = useCallback((chunkPayload) => {
        if (!chunkPayload) return;

        let base64 = '';
        if (typeof chunkPayload === 'string') {
            base64 = chunkPayload;
        } else if (chunkPayload.audioBase64) {
            base64 = chunkPayload.audioBase64;
        } else if (chunkPayload.data) {
            base64 = chunkPayload.data;
        }

        if (!base64) return;

        const index = chunkCounterRef.current++;
        pendingQueueRef.current.push({ base64, index });
        scheduleNextBuffers();
    }, [scheduleNextBuffers]);

    /**
     * Instantaneous flush: cancels active AudioBufferSourceNodes immediately,
     * clears pending queue, and resets playback timeline.
     */
    const flushQueue = useCallback(() => {
        // Cancel all currently playing buffer sources
        activeSourcesRef.current.forEach((source) => {
            try {
                source.stop(0);
                source.disconnect();
            } catch {}
        });
        activeSourcesRef.current = [];

        // Empty pending queue
        pendingQueueRef.current = [];
        nextStartTimeRef.current = 0;
        chunkCounterRef.current = 0;
        isProcessingRef.current = false;

        setIsPlaying(false);
        setCurrentChunkIndex(0);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            activeSourcesRef.current.forEach((source) => {
                try {
                    source.stop(0);
                    source.disconnect();
                } catch {}
            });
            activeSourcesRef.current = [];
            pendingQueueRef.current = [];

            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                try {
                    audioContextRef.current.close();
                } catch {}
            }
        };
    }, []);

    return {
        queueAudioChunk,
        flushQueue,
        isPlaying,
        currentChunkIndex,
        analyser,
        audioContext
    };
}

export default useAudioQueue;
