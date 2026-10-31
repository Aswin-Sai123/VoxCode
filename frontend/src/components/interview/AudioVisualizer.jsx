import React, { useRef, useEffect } from 'react';

/**
 * AudioVisualizer: Dynamic HTML5 Canvas audio waveform visualizer.
 * Reads frequency/time-domain data from an AnalyserNode and renders smooth animated
 * bars or wave. Includes graceful simulated fallback when AnalyserNode is unavailable.
 */
export const AudioVisualizer = ({
    analyser = null,
    isActive = false,
    barCount = 36,
    barColor = '#3B82F6', // Blue default, can pass emerald or gradient
    height = 48,
    width = 240,
    className = ''
}) => {
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const phaseRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let dataArray = null;
        if (analyser) {
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        }

        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth || width;
            const h = canvas.clientHeight || height;

            if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
                canvas.width = w * dpr;
                canvas.height = h * dpr;
                ctx.scale(dpr, dpr);
            }

            ctx.clearRect(0, 0, w, h);

            phaseRef.current += 0.08;
            const phase = phaseRef.current;

            const totalBars = Math.max(12, Math.min(64, barCount));
            const barSpacing = 3;
            const availableWidth = w - (totalBars - 1) * barSpacing;
            const barWidth = Math.max(2, availableWidth / totalBars);

            // Fetch live frequency data if analyser is present
            let hasRealData = false;
            if (analyser && dataArray && isActive) {
                try {
                    analyser.getByteFrequencyData(dataArray);
                    hasRealData = true;
                } catch {}
            }

            for (let i = 0; i < totalBars; i++) {
                let normalizedVal = 0.08; // baseline resting height

                if (isActive) {
                    if (hasRealData) {
                        // Sample from frequency bins
                        const binIndex = Math.floor((i / totalBars) * Math.min(dataArray.length, 64));
                        const raw = dataArray[binIndex] || 0;
                        normalizedVal = Math.max(0.1, raw / 255);
                    } else {
                        // Organic sinusoidal simulation
                        const harmonic1 = Math.sin(phase + (i * 0.35));
                        const harmonic2 = Math.cos(phase * 0.6 + (i * 0.2));
                        normalizedVal = 0.25 + 0.35 * Math.abs(harmonic1) + 0.25 * Math.abs(harmonic2);
                    }
                }

                const barH = Math.max(4, normalizedVal * (h - 6));
                const x = i * (barWidth + barSpacing);
                const y = (h - barH) / 2;

                // Color gradient
                const grad = ctx.createLinearGradient(0, y, 0, y + barH);
                if (isActive) {
                    grad.addColorStop(0, barColor);
                    grad.addColorStop(1, '#1E40AF'); // darker complement
                } else {
                    grad.addColorStop(0, '#38384A');
                    grad.addColorStop(1, '#232330');
                }

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barH, [barWidth / 2]);
                ctx.fill();
            }

            animFrameRef.current = requestAnimationFrame(render);
        };

        animFrameRef.current = requestAnimationFrame(render);

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
        };
    }, [analyser, isActive, barCount, barColor, height, width]);

    return (
        <canvas
            ref={canvasRef}
            className={`block rounded-lg ${className}`}
            style={{ width: `${width}px`, height: `${height}px` }}
        />
    );
};

export default AudioVisualizer;
