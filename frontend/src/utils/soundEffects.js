// Web Audio API Synthesizer for high-end subtle tactile UI sounds (Zero external asset dependencies)

let audioCtx = null;

const getAudioContext = () => {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
};

// Warm chime when Rohan begins speaking
export const playChime = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(659.25, now);
        osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5

        gainNode.gain.setValueAtTime(0.04, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    } catch {
        // Fallback gracefully if audio is blocked by browser policy
    }
};

// Crisp tactile click on mic toggle / push-to-talk
export const playClick = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
    } catch {}
};

// Ascending harmonic chime when test cases pass
export const playSuccess = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + index * 0.08);

            gain.gain.setValueAtTime(0.03, now + index * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + index * 0.08);
            osc.stop(now + index * 0.08 + 0.3);
        });
    } catch {}
};

// Subtle double-blip when proctoring violation occurs
export const playWarning = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        [0, 0.1].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now + delay);

            gain.gain.setValueAtTime(0.02, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.07);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + delay);
            osc.stop(now + delay + 0.07);
        });
    } catch {}
};
