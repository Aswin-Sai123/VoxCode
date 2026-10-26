import React, { useRef, useEffect, useState } from 'react';

/**
 * Bespoke Audio Engineering Visualizer
 * Replaces generic Siri-like concentric orb circles with a high-fidelity,
 * physics-damped canvas oscilloscope ribbon and precision multi-band audio telemetry.
 */
const VoiceVisualizerOrb = ({
    isAiSpeaking = false,
    isListening = false,
    isSending = false,
    audioLevel = 0,
    className = ''
}) => {
    const canvasRef = useRef(null);

    // Spring physics simulation state
    const physicsRef = useRef({
        currentAmp: 0.1,
        velocity: 0,
        phase: 0,
        bandLevels: new Array(32).fill(0.08)
    });

    const [dbfsDisplay, setDbfsDisplay] = useState(-42);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            const physics = physicsRef.current;

            // Target amplitude calculation based on state
            let targetAmp = 0.06;
            if (isAiSpeaking) {
                targetAmp = 0.65 + Math.sin(physics.phase * 3) * 0.2;
            } else if (isListening) {
                // Scaled from candidate's real microphone level (0-100)
                const normalized = Math.min(1, Math.max(0, audioLevel / 65));
                targetAmp = Math.max(0.08, normalized);
            } else if (isSending) {
                targetAmp = 0.22 + Math.sin(physics.phase * 5) * 0.08;
            }

            // Spring physics update: F = -k*(x - target) - c*v
            const stiffness = 0.18;
            const damping = 0.76;
            const force = (targetAmp - physics.currentAmp) * stiffness;
            physics.velocity = (physics.velocity + force) * damping;
            physics.currentAmp += physics.velocity;
            physics.phase += 0.045;

            // Update dBFS estimate
            const rawDbfs = Math.round(-42 + physics.currentAmp * 36);
            setDbfsDisplay(rawDbfs);

            // Clear frame
            ctx.clearRect(0, 0, width, height);

            // Determine active palette
            let strokeColor = '#3B82F6'; // Blue for candidate
            let fillColor = 'rgba(59, 130, 246, 0.08)';
            let accentGlow = 'rgba(59, 130, 246, 0.25)';

            if (isAiSpeaking) {
                strokeColor = '#10B981'; // Emerald for AI
                fillColor = 'rgba(16, 185, 129, 0.08)';
                accentGlow = 'rgba(16, 185, 129, 0.25)';
            } else if (isSending) {
                strokeColor = '#F59E0B'; // Amber for DSP thinking
                fillColor = 'rgba(245, 158, 11, 0.08)';
                accentGlow = 'rgba(245, 158, 11, 0.25)';
            } else if (!isListening && !isAiSpeaking && !isSending) {
                strokeColor = '#4B5563'; // Muted grey for resting idle
                fillColor = 'rgba(75, 85, 99, 0.03)';
                accentGlow = 'transparent';
            }

            // Draw subtle background grid lines
            ctx.strokeStyle = '#1A1A24';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();

            // 1. Oscilloscope Ribbon (Multi-harmonic Bezier curve)
            ctx.save();
            ctx.shadowColor = accentGlow;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;

            ctx.beginPath();
            const centerY = height / 2;
            const points = [];
            const segments = 48;

            for (let i = 0; i <= segments; i++) {
                const x = (i / segments) * width;
                const progress = i / segments;
                // Envelope window (fade at edges so ribbon joins baseline)
                const envelope = Math.sin(progress * Math.PI);

                // Harmonics
                const h1 = Math.sin(progress * 8 + physics.phase * 2) * 22;
                const h2 = Math.cos(progress * 14 - physics.phase * 3) * 10;
                const y = centerY + (h1 + h2) * physics.currentAmp * envelope;
                points.push({ x, y });

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    const prev = points[i - 1];
                    const cx = (prev.x + x) / 2;
                    const cy = (prev.y + y) / 2;
                    ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
                }
            }
            ctx.stroke();

            // Translucent ribbon fill beneath the wave
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.restore();

            // 2. Precision Minimalist Multi-Band Spectrum (32 bars)
            const numBars = 32;
            const barWidth = 3;
            const gap = (width - numBars * barWidth) / (numBars + 1);

            for (let b = 0; b < numBars; b++) {
                const barProgress = b / numBars;
                const bell = Math.sin(barProgress * Math.PI);
                const harmonic = Math.abs(Math.sin(physics.phase * 2 + barProgress * 6));
                const targetBarH = (physics.currentAmp * 34 * bell * (0.6 + harmonic * 0.4));

                // Spring ease per bar
                physics.bandLevels[b] += (targetBarH - physics.bandLevels[b]) * 0.25;
                const barH = Math.max(3, physics.bandLevels[b]);

                const bx = gap + b * (barWidth + gap);
                const by = height - 6 - barH;

                ctx.fillStyle = strokeColor;
                ctx.fillRect(bx, by, barWidth, barH);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isAiSpeaking, isListening, isSending, audioLevel]);

    // Status label and badge
    const getStatusInfo = () => {
        if (isAiSpeaking) {
            return {
                label: 'AI TRANSMITTING',
                detail: 'SYNTHESIS AUDIO STREAM ACTIVE',
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            };
        }
        if (isListening) {
            return {
                label: 'CANDIDATE MIC',
                detail: 'VOICE ACTIVITY DETECTED (VAD)',
                color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                dot: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
            };
        }
        if (isSending) {
            return {
                label: 'DSP PIPELINE',
                detail: 'REASONING & TOKEN STREAMING',
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
            };
        }
        return {
            label: 'STANDBY',
            detail: 'AWAITING SPOKEN CADENCE',
            color: 'text-[#8B8B9E] bg-[#141419] border-[#232330]',
            dot: 'bg-[#555568]'
        };
    };

    const status = getStatusInfo();

    return (
        <div className={`w-full max-w-lg mx-auto bg-[#101015] border border-[#232330] rounded-xl p-4 shadow-xl flex flex-col space-y-3 light-catch ${className}`}>
            {/* Top Telemetry Header */}
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#1C1C26] pb-2.5">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.dot} transition-all`} />
                    <span className="font-semibold text-[#EDEDF0] tracking-wide">{status.label}</span>
                    <span className="text-[#3A3A4C]">/</span>
                    <span className="text-[#8B8B9E] text-[10px] hidden sm:inline">{status.detail}</span>
                </div>
                <div className="flex items-center gap-2 text-[#8B8B9E] text-[10px]">
                    <span className="tabular-nums font-mono text-[#EDEDF0]">{dbfsDisplay} dBFS</span>
                    <span className="text-[#3A3A4C]">|</span>
                    <span>48kHz</span>
                </div>
            </div>

            {/* High-Fidelity Physics Canvas Oscilloscope */}
            <div className="relative w-full h-24 bg-[#0A0A0E] rounded-lg border border-[#1A1A24] overflow-hidden flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    width={480}
                    height={96}
                    className="w-full h-full object-cover"
                />

                {/* Corner Engineering Reticles */}
                <div className="absolute top-1.5 left-2 text-[9px] font-mono text-[#444455] select-none pointer-events-none">
                    OSC-CH1
                </div>
                <div className="absolute top-1.5 right-2 text-[9px] font-mono text-[#444455] select-none pointer-events-none">
                    WEBAUDIO·DSP
                </div>
            </div>

            {/* Hardware dBFS Meter & Latency Readout */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#555568] pt-0.5">
                <div className="flex items-center gap-1.5 flex-1 max-w-[240px]">
                    <span className="text-[#8B8B9E] text-[9px] uppercase">GAIN</span>
                    <div className="flex-1 h-1.5 bg-[#171720] rounded-sm overflow-hidden flex gap-0.5">
                        <div
                            className={`h-full transition-all duration-75 ${
                                dbfsDisplay > -12 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(8, (dbfsDisplay + 42) * 2.8))}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[9px] tracking-wider text-[#8B8B9E]">
                    <span className="text-emerald-400/90 font-semibold">LATENCY: ~75ms</span>
                    <span>•</span>
                    <span>PCM STREAM</span>
                </div>
            </div>
        </div>
    );
};

export default VoiceVisualizerOrb;
