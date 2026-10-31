import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useVAD: Voice Activity Detection using Web Audio API (AnalyserNode & RMS calculation).
 * Features configurable energy thresholding and speech-start / speech-end debouncing.
 * Invokes onSpeechStart callback immediately when voice is detected, enabling instant barge-in.
 * 
 * @param {Object} options
 * @param {Function} [options.onSpeechStart] - Invoked when user begins speaking
 * @param {Function} [options.onSpeechEnd] - Invoked when user stops speaking
 * @param {number} [options.speechThreshold=0.04] - RMS threshold to consider as voice
 * @param {number} [options.speechStartDebounceMs=120] - Milliseconds of continuous voice to trigger start
 * @param {number} [options.speechEndDebounceMs=800] - Milliseconds of continuous silence to trigger end
 * @param {MediaStream} [options.externalStream] - Optional existing stream to use
 */
export function useVAD({
    onSpeechStart,
    onSpeechEnd,
    speechThreshold = 0.04,
    speechStartDebounceMs = 120,
    speechEndDebounceMs = 800,
    externalStream = null
} = {}) {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volume, setVolume] = useState(0);

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const animFrameRef = useRef(null);

    const onSpeechStartRef = useRef(onSpeechStart);
    const onSpeechEndRef = useRef(onSpeechEnd);
    useEffect(() => {
        onSpeechStartRef.current = onSpeechStart;
        onSpeechEndRef.current = onSpeechEnd;
    }, [onSpeechStart, onSpeechEnd]);

    const isSpeakingRef = useRef(false);
    const speechStartTimeRef = useRef(0);
    const silenceStartTimeRef = useRef(0);

    const stopListening = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.disconnect();
            } catch {}
            sourceNodeRef.current = null;
        }

        if (streamRef.current && !externalStream) {
            try {
                streamRef.current.getTracks().forEach(t => t.stop());
            } catch {}
            streamRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
                audioContextRef.current.close();
            } catch {}
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        isSpeakingRef.current = false;
        speechStartTimeRef.current = 0;
        silenceStartTimeRef.current = 0;

        setIsListening(false);
        setIsSpeaking(false);
        setVolume(0);
    }, [externalStream]);

    const startListening = useCallback(async () => {
        if (isListening) return;

        try {
            let stream = externalStream;
            if (!stream) {
                if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                    throw new Error('navigator.mediaDevices.getUserMedia is not available');
                }
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            }
            streamRef.current = stream;

            const AudioCtx = typeof window !== 'undefined'
                ? (window.AudioContext || window.webkitAudioContext)
                : null;

            if (!AudioCtx) throw new Error('AudioContext not supported');

            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            audioContextRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.3;
            analyserRef.current = analyser;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceNodeRef.current = source;

            setIsListening(true);

            const bufferLength = analyser.fftSize;
            const dataArray = new Float32Array(bufferLength);

            const checkAudio = () => {
                if (!analyserRef.current) return;

                analyserRef.current.getFloatTimeDomainData(dataArray);

                // Calculate RMS energy
                let sumSquares = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sumSquares += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sumSquares / bufferLength);
                setVolume(+rms.toFixed(4));

                const now = performance.now();

                if (rms >= speechThreshold) {
                    silenceStartTimeRef.current = 0;

                    if (!speechStartTimeRef.current) {
                        speechStartTimeRef.current = now;
                    } else if (now - speechStartTimeRef.current >= speechStartDebounceMs) {
                        if (!isSpeakingRef.current) {
                            isSpeakingRef.current = true;
                            setIsSpeaking(true);
                            if (onSpeechStartRef.current) {
                                onSpeechStartRef.current({ volume: rms });
                            }
                        }
                    }
                } else {
                    speechStartTimeRef.current = 0;

                    if (isSpeakingRef.current) {
                        if (!silenceStartTimeRef.current) {
                            silenceStartTimeRef.current = now;
                        } else if (now - silenceStartTimeRef.current >= speechEndDebounceMs) {
                            isSpeakingRef.current = false;
                            setIsSpeaking(false);
                            if (onSpeechEndRef.current) {
                                onSpeechEndRef.current();
                            }
                        }
                    }
                }

                animFrameRef.current = requestAnimationFrame(checkAudio);
            };

            animFrameRef.current = requestAnimationFrame(checkAudio);

        } catch (err) {
            console.warn('[useVAD] Failed to start VAD:', err);
            stopListening();
            throw err;
        }
    }, [isListening, externalStream, speechThreshold, speechStartDebounceMs, speechEndDebounceMs, stopListening]);

    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    return {
        isSpeaking,
        volume,
        startListening,
        stopListening,
        isListening
    };
}

export default useVAD;
