import { SpeechClient } from '@google-cloud/speech';

let speechClientInstance = null;

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

export function isSpeechClientConfigured() {
    if (process.env.NODE_ENV === 'test') return false;
    if (process.env.MOCK_STT === 'true') return false;
    return Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
        process.env.GOOGLE_CLOUD_KEY_JSON
    );
}

function getSpeechClient() {
    if (!speechClientInstance) {
        speechClientInstance = new SpeechClient();
    }
    return speechClientInstance;
}

export async function transcribeAudioBuffer(inputBuffer, sampleRate = 16000, options = {}) {
    const pcmBuffer = decodeAudioBuffer(inputBuffer);
    if (!pcmBuffer || pcmBuffer.length === 0) {
        return '';
    }

    // Deterministic mock fallback in test environments
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_STT === 'true') {
        const textStr = pcmBuffer.toString('utf8');
        if (textStr.startsWith('MOCK:')) {
            return textStr.slice(5).trim();
        }
        return process.env.MOCK_STT_TRANSCRIPT || 'I have experience building distributed systems with Node.js and MongoDB.';
    }

    if (!isSpeechClientConfigured()) {
        console.warn('[STT] Google Cloud Speech credentials not configured in environment. Skipping server-side STT.');
        return '';
    }

    try {
        const client = getSpeechClient();
        const [response] = await client.recognize({
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

        const transcript = response?.results
            ?.map(r => r.alternatives?.[0]?.transcript)
            ?.filter(Boolean)
            ?.join(' ') || '';

        return transcript.trim();
    } catch (err) {
        console.warn('[STT] Google Cloud Speech transcription error:', err.message);
        return '';
    }
}

