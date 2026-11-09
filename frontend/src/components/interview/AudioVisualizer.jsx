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

            if (!isActive) {
                for (let i = 0; i < totalBars; i++) {
                    const barH = 4;
                    const x = i * (barWidth + barSpacing);
                    const y = (h - barH) / 2;
                    ctx.fillStyle = '#232330';
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, barH, [barWidth / 2]);
                    ctx.fill();
                }
                return;
            }

            // Fetch live frequency data if analyser is present
            let hasRealData = false;
            if (analyser && dataArray && isActive) {
                try {
                    analyser.getByteFrequencyData(dataArray);
                    hasRealData = true;
                } catch {}
            }

            for (let i = 0; i < totalBars; i++) {
                let normalizedVal = 0.15;

                if (hasRealData) {
                    const binIndex = Math.floor((i / totalBars) * Math.min(dataArray.length, 64));
                    const raw = dataArray[binIndex] || 0;
                    normalizedVal = Math.max(0.12, raw / 255);
                } else {
                    const harmonic = Math.sin(phase + (i * 0.4));
                    normalizedVal = 0.2 + 0.3 * Math.abs(harmonic);
                }

                const barH = Math.max(4, normalizedVal * (h - 6));
                const x = i * (barWidth + barSpacing);
                const y = (h - barH) / 2;

                ctx.fillStyle = barColor;
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
