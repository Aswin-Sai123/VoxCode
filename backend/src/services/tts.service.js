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

export const synthesizeEdgeSpeech = async (text, voiceName = "en-IN-NeerjaNeural") => {
    try {
        const cleanText = text.replace(/[*_#`]/g, '').trim();
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(cleanText);

        const chunks = [];
        for await (const chunk of audioStream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        return {
            audioBase64: `data:audio/mp3;base64,${buffer.toString('base64')}`,
            buffer,
            voiceName
        };
    } catch (err) {
        console.error("Failed to synthesize Edge speech:", err);
        throw err;
    }
};

export const synthesizeGoogleSpeech = async (text, voiceName = "en-IN-Neural2-B") => {
    // If Google Cloud credentials are configured in environment, attempt Google Cloud TTS
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (apiKey) {
        try {
            const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: text.replace(/[*_#`]/g, '').trim() },
                    voice: { languageCode: "en-IN", name: voiceName },
                    audioConfig: { audioEncoding: "MP3" }
                })
            });
            const data = await res.json();
            if (data.audioContent) {
                return {
                    audioBase64: `data:audio/mp3;base64,${data.audioContent}`,
                    voiceName
                };
            }
        } catch (err) {
            console.warn("Google Cloud TTS failed, falling back to Edge Neural:", err);
        }
    }

    // Graceful fallback to Edge Neural if Google Cloud is not directly authenticated
    return await synthesizeEdgeSpeech(text, "en-IN-NeerjaNeural");
};
