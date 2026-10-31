import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const VOICE_MODELS = [
    {
        id: "edge-neural-neerja",
        name: "Microsoft Edge Neural — Neerja",
        gender: "Female",
        locale: "en-IN (Indian English)",
        engine: "Edge Online Neural",
        cost: "$0 (100% Free)",
        limits: "Unlimited usage forever. Zero API keys required.",
        badge: "Recommended • Free",
        badgeColor: "emerald",
        sampleText: "Hello! I am Neerja, your technical interviewer. Let's explore your system design and coding skills.",
        recommended: true
    },
    {
        id: "edge-neural-prabhat",
        name: "Microsoft Edge Neural — Prabhat",
        gender: "Male",
        locale: "en-IN (Indian English)",
        engine: "Edge Online Neural",
        cost: "$0 (100% Free)",
        limits: "Unlimited usage forever. Zero API keys required.",
        badge: "Free • Neural Male",
        badgeColor: "emerald",
        sampleText: "Hi there! I'm Prabhat. I'll be guiding you through today's technical algorithms and architecture round."
    },
    {
        id: "browser-speech",
        name: "Browser Native Speech API",
        gender: "System Dependent",
        locale: "Client OS (en-IN / en-US)",
        engine: "Web Speech API (SpeechSynthesis)",
        cost: "$0 (100% Free)",
        limits: "Runs 100% locally on your browser. Zero network delay.",
        badge: "Zero Network Latency",
        badgeColor: "blue",
        sampleText: "This voice runs directly inside your browser engine with instant response time."
    },
    {
        id: "google-cloud-neural",
        name: "Google Cloud TTS — Neural2 / WaveNet",
        gender: "Dynamic",
        locale: "en-IN (Indian English)",
        engine: "Google Cloud Neural2",
        cost: "Free Tier (1M chars/mo)",
        limits: "1,000,000 characters free each month (~15-20 full interviews). Then $0.000016/char.",
        badge: "GCP Free Tier",
        badgeColor: "purple",
        sampleText: "This is Google Cloud's deep neural synthesizer trained with state of the art speech models."
    }
];

export const VOICE_MAP = {
    'edge-neural-neerja': 'en-IN-NeerjaNeural',
    'edge-neural-prabhat': 'en-IN-PrabhatNeural',
    'google-cloud-neural': 'en-IN-Neural2-B'
};

export const SENTENCE_REGEX = /(?:[^.!?]|(?<!\s)[.!?](?!\s|$)|(?<=\b(?:e\.g|i\.e|etc|vs|dr|mr|ms))\.)+(?:[.!?]+['"’”\)\]\}]*(?:\s+|$)|$)/gi;

export const MOCK_AUDIO_BASE64 = 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcAAA';

export function resolveVoiceName(voiceModel) {
    if (!voiceModel) return 'en-IN-NeerjaNeural';
    if (VOICE_MAP[voiceModel]) return VOICE_MAP[voiceModel];
    if (typeof voiceModel === 'string' && voiceModel.includes('Neural')) return voiceModel;
    return 'en-IN-NeerjaNeural';
}

export function cleanTextForSpeech(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        // Strip code blocks cleanly
        .replace(/```[\s\S]*?```/g, ' ')
        // Convert technical complexity notation to natural spoken English
        .replace(/O\(1\)/gi, 'O of 1')
        .replace(/O\(n\^2\)|O\(n\*\*2\)/gi, 'O of N squared')
        .replace(/O\(n\s*log\s*n\)/gi, 'O of N log N')
        .replace(/O\(log\s*n\)/gi, 'O of log N')
        .replace(/O\(n\)/gi, 'O of N')
        .replace(/O\(k\)/gi, 'O of K')
        .replace(/O\(v\s*\+\s*e\)/gi, 'O of V plus E')
        // Convert symbols to conversational spoken terms
        .replace(/\bJSON\.stringify\b/gi, 'JSON stringify')
        .replace(/\bJSON\.parse\b/gi, 'JSON parse')
        .replace(/!=/g, ' not equal to ')
        .replace(/===/g, ' strictly equal to ')
        .replace(/==/g, ' equal to ')
        .replace(/&&/g, ' and ')
        .replace(/\|\|/g, ' or ')
        .replace(/=>/g, ' yields ')
        .replace(/\/\//g, ' ') // Strip code comments //
        .replace(/\bconst\s+|\blet\s+|\bvar\s+/gi, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_#~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function splitIntoSentences(text) {
    const clean = cleanTextForSpeech(text);
    if (!clean) return [];
    const matches = clean.match(SENTENCE_REGEX);
    if (!matches || matches.length === 0) return [clean];
    return matches.map(s => s.trim()).filter(Boolean);
}

// Warm instance cache per voice to avoid repeated WebSocket handshakes
const ttsPool = new Map();

async function getOrCreateEdgeTTS(voiceName) {
    if (!ttsPool.has(voiceName)) {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        ttsPool.set(voiceName, tts);
    }
    return ttsPool.get(voiceName);
}

export const synthesizeEdgeSpeech = async (text, voiceName = "en-IN-NeerjaNeural", options = {}) => {
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_TTS === 'true') {
        return {
            audioBase64: MOCK_AUDIO_BASE64,
            buffer: Buffer.from(MOCK_AUDIO_BASE64.split(',')[1], 'base64'),
            voiceName
        };
    }

    try {
        const cleanText = cleanTextForSpeech(text);
        if (!cleanText) {
            return { audioBase64: '', buffer: Buffer.alloc(0), voiceName };
        }

        let tts;
        try {
            tts = await getOrCreateEdgeTTS(voiceName);
        } catch {
            tts = new MsEdgeTTS();
            await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        }

        const { audioStream } = tts.toStream(cleanText, { rate: '+15%', pitch: '+0Hz' });

        const chunks = [];
        for await (const chunk of audioStream) {
            if (options.signal?.aborted) {
                audioStream.destroy?.();
                return null;
            }
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        return {
            audioBase64: `data:audio/mp3;base64,${buffer.toString('base64')}`,
            buffer,
            voiceName
        };
    } catch (err) {
        // Evict from pool on socket error so next attempt reconnects cleanly
        ttsPool.delete(voiceName);
        if (options.signal?.aborted) return null;
        console.error("Failed to synthesize Edge speech:", err);
        throw err;
    }
};

export const synthesizeGoogleSpeech = async (text, voiceName = "en-IN-Neural2-B", options = {}) => {
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_TTS === 'true') {
        return {
            audioBase64: MOCK_AUDIO_BASE64,
            voiceName
        };
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (apiKey) {
        try {
            const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: cleanTextForSpeech(text) },
                    voice: { languageCode: "en-IN", name: voiceName },
                    audioConfig: { audioEncoding: "MP3" }
                }),
                signal: options.signal
            });
            const data = await res.json();
            if (data.audioContent) {
                return {
                    audioBase64: `data:audio/mp3;base64,${data.audioContent}`,
                    voiceName
                };
            }
        } catch (err) {
            if (options.signal?.aborted) return null;
            console.warn("Google Cloud TTS failed, falling back to Edge Neural:", err.message);
        }
    }

    return await synthesizeEdgeSpeech(text, "en-IN-NeerjaNeural", options);
};

export async function* streamTTSChunks(text, voiceModel = 'edge-neural-neerja', options = {}) {
    const { signal } = options;
    if (signal?.aborted) return;

    const sentences = splitIntoSentences(text);
    if (!sentences || sentences.length === 0) return;

    const voiceName = resolveVoiceName(voiceModel);

    for (let i = 0; i < sentences.length; i++) {
        if (signal?.aborted) return;
        const sentence = sentences[i];

        let result;
        if (voiceModel === 'google-cloud-neural') {
            result = await synthesizeGoogleSpeech(sentence, voiceName, { signal });
        } else {
            result = await synthesizeEdgeSpeech(sentence, voiceName, { signal });
        }

        if (signal?.aborted || !result) return;

        yield {
            text: sentence,
            sentence,
            audioBase64: result.audioBase64,
            voiceName: result.voiceName,
            chunkIndex: i,
            totalChunks: sentences.length,
            isFinal: i === sentences.length - 1
        };
    }
}
