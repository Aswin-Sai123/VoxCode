// Speech-to-Text service with Google Cloud Speech fallback and free Gemini 2.5 Flash fallback

import { SpeechClient } from '@google-cloud/speech';

let speechClientInstance = null;

/**
 * Decode various audio buffer representations into a Node Buffer.
 */
export function decodeAudioBuffer(input) {
    if (!input) return Buffer.alloc(0);
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === 'string') {
        const cleanBase64 = input.replace(/^data:audio\/[a-zA-Z0-9_-]+;base64,/, '').trim();
        return Buffer.from(cleanBase64, 'base64');
    }
    if (input instanceof Uint8Array || input instanceof ArrayBuffer) {
        return Buffer.from(input);
    }
    return Buffer.alloc(0);
}

/**
 * Check whether Google Cloud Speech credentials are available.
 */
export function isSpeechClientConfigured() {
    if (process.env.NODE_ENV === 'test') return false;
    if (process.env.MOCK_STT === 'true') return false;
    return Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
        process.env.GOOGLE_CLOUD_KEY_JSON
    );
}

/**
 * Lazily create a SpeechClient instance.
 */
function getSpeechClient() {
    if (!speechClientInstance) {
        speechClientInstance = new SpeechClient();
    }
    return speechClientInstance;
}

/**
 * Creates a minimal 44‑byte WAV header for PCM data.
 */
function createWavHeader(sampleRate = 16000, numChannels = 1, bitsPerSample = 16, dataLength = 0) {
    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // PCM format
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    return buffer;
}

/**
 * High‑accuracy fallback transcription using Gemini 2.5 Flash Audio API.
 */
async function transcribeWithGemini(pcmBuffer, sampleRate = 16000) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return '';
    try {
        const wavHeader = createWavHeader(sampleRate, 1, 16, pcmBuffer.length);
        const fullWav = Buffer.concat([wavHeader, pcmBuffer]);
        const base64Wav = fullWav.toString('base64');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inlineData: { mimeType: 'audio/wav', data: base64Wav } },
                        { text: 'You are an accurate Speech-to-Text transcriber for technical software engineering interviews. Transcribe the spoken speech in this audio verbatim. Accurately preserve technical names, code syntax, algorithms, data structures, and acronyms. If the audio contains only silence, breathing, background clicks, or no recognizable human speech, respond strictly with EMPTY.' }
                    ]
                }],
                generationConfig: { temperature: 0.0 }
            }),
            signal: AbortSignal.timeout(12000)
        });
        if (!response.ok) {
            const errBody = await response.text();
            console.warn('[STT] Gemini transcription HTTP error:', response.status, errBody);
            return '';
        }
        const data = await response.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const trimmed = raw.trim();
        if (!trimmed || trimmed.toUpperCase() === 'EMPTY' || trimmed.toUpperCase() === 'EMPTY.') {
            return '';
        }
        return trimmed;
    } catch (err) {
        console.warn('[STT] Gemini transcription error:', err.message);
        return '';
    }
}

/**
 * Main entry point used by the backend to transcribe an incoming audio buffer.
 */
export async function transcribeAudioBuffer(inputBuffer, sampleRate = 16000, options = {}) {
    const pcmBuffer = decodeAudioBuffer(inputBuffer);
    if (!pcmBuffer || pcmBuffer.length === 0) return '';

    // Mock mode for tests / deterministic runs
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_STT === 'true') {
        const txt = pcmBuffer.toString('utf8');
        if (txt.startsWith('MOCK:')) return txt.slice(5).trim();
        return process.env.MOCK_STT_TRANSCRIPT || 'I have experience building distributed systems with Node.js and MongoDB.';
    }

    // Try Google Cloud Speech first if credentials are present
    if (isSpeechClientConfigured()) {
        try {
            const client = getSpeechClient();
            const [resp] = await client.recognize({
                audio: { content: pcmBuffer.toString('base64') },
                config: {
                    encoding: options.encoding || 'LINEAR16',
                    sampleRateHertz: sampleRate,
                    languageCode: options.languageCode || 'en-IN',
                    alternativeLanguageCodes: options.alternativeLanguageCodes || ['en-US'],
                    enableAutomaticPunctuation: true,
                    model: options.model || 'latest_long'
                }
            });
            const transcript = resp?.results?.map(r => r.alternatives?.[0]?.transcript).filter(Boolean).join(' ') || '';
            if (transcript.trim()) return transcript.trim();
        } catch (err) {
            console.warn('[STT] Google Cloud Speech error, falling back to Gemini:', err.message);
        }
    }

    // Free Gemini fallback
    if (process.env.GEMINI_API_KEY) {
        const gemini = await transcribeWithGemini(pcmBuffer, sampleRate);
        if (gemini) return gemini;
    }
    return '';
}
