import React from 'react';

const VoiceVisualizerOrb = ({
    isAiSpeaking = false,
    isListening = false,
    isSending = false,
    audioLevel = 0,
    className = ''
}) => {
    // Generate 24 dynamic frequency bar values based on state and live amplitude
    const barCount = 24;
    const bars = Array.from({ length: barCount }, (_, i) => {
        if (isAiSpeaking) {
            // Fluid sinusoidal harmonic animation for Rohan's voice
            const phase = (i / barCount) * Math.PI * 2;
            const variance = Math.sin(phase * 2) * 12 + Math.cos(phase * 3) * 8;
            return Math.max(8, 26 + variance);
        }
        if (isListening) {
            // Scaled dynamically by real microphone amplitude
            const normalizedLevel = Math.min(100, audioLevel * 1.8);
            const factor = Math.sin((i / barCount) * Math.PI);
            return Math.max(4, Math.round(normalizedLevel * factor * 0.45));
        }
        if (isSending) {
            // Soft oscillating pulse when LLM is thinking
            return 6 + (i % 4) * 3;
        }
        return 4; // Idle resting baseline
    });

    const activeColor = 
        isAiSpeaking 
            ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' 
            : isListening 
                ? 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.5)]' 
                : isSending 
                    ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]' 
                    : 'bg-[#2E2E3E]';

    return (
        <div className={`flex flex-col items-center justify-center gap-3 w-full max-w-lg mx-auto py-2 ${className}`}>
            {/* Glowing Voice Orb with Concentric Waves */}
            <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Outer Expansion Wave */}
                {(isAiSpeaking || isListening) && (
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
                        isAiSpeaking ? 'bg-emerald-400' : 'bg-blue-400'
                    }`} />
                )}

                {/* Secondary Breathing Halo */}
                <div className={`absolute -inset-2 rounded-full blur-md transition-all duration-300 ${
                    isAiSpeaking 
                        ? 'bg-emerald-500/30 scale-110' 
                        : isListening 
                            ? 'bg-blue-500/30 scale-110' 
                            : isSending 
                                ? 'bg-amber-500/20 animate-pulse' 
                                : 'bg-transparent'
                }`} />

                {/* Core Sphere */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 shadow-xl ${
                    isAiSpeaking
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 border-emerald-300/60 shadow-emerald-500/30'
                        : isListening
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-400 border-blue-300/60 shadow-blue-500/30'
                            : isSending
                                ? 'bg-gradient-to-tr from-amber-600 to-yellow-400 border-amber-300/60 shadow-amber-500/30 animate-pulse'
                                : 'bg-[#181820] border-[#2A2A3A] text-[#8B8B9E]'
                }`}>
                    {/* Inner Core Light Point */}
                    <div className={`w-3.5 h-3.5 rounded-full transition-all ${
                        isAiSpeaking 
                            ? 'bg-white shadow-[0_0_8px_#ffffff]' 
                            : isListening 
                                ? 'bg-white shadow-[0_0_8px_#ffffff]' 
                                : isSending 
                                    ? 'bg-yellow-100 animate-ping' 
                                    : 'bg-[#3A3A4C]'
                    }`} />
                </div>
            </div>

            {/* Fluid Frequency Soundwave Bars */}
            <div className="flex items-center justify-center gap-1 h-10 w-full px-4">
                {bars.map((h, index) => (
                    <span
                        key={index}
                        style={{ height: `${h}px` }}
                        className={`w-1 rounded-full transition-all duration-150 ${activeColor}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default VoiceVisualizerOrb;
