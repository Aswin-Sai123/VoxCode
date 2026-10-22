import { VOICE_MODELS, synthesizeEdgeSpeech, synthesizeGoogleSpeech } from "../services/tts.service.js";

export const getVoiceModels = async (req, res) => {
    return res.status(200).json({
        success: true,
        data: VOICE_MODELS
    });
};

export const synthesizeSpeech = async (req, res) => {
    try {
        const { text, voiceModel = "edge-neural-neerja" } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: "Text is required for speech synthesis"
            });
        }

        const cleanText = text.trim();

        // 1. Browser Speech Engine: client-side synthesized
        if (voiceModel === "browser-speech") {
            return res.status(200).json({
                success: true,
                data: {
                    useBrowserTts: true,
                    text: cleanText,
                    voiceModel: "browser-speech"
                }
            });
        }

        // 2. Microsoft Edge Neural - Neerja (Female)
        if (voiceModel === "edge-neural-neerja") {
            const result = await synthesizeEdgeSpeech(cleanText, "en-IN-NeerjaNeural");
            return res.status(200).json({
                success: true,
                data: {
                    audioBase64: result.audioBase64,
                    format: "audio/mp3",
                    voiceModel,
                    voiceName: "en-IN-NeerjaNeural"
                }
            });
        }

        // 3. Microsoft Edge Neural - Prabhat (Male)
        if (voiceModel === "edge-neural-prabhat") {
            const result = await synthesizeEdgeSpeech(cleanText, "en-IN-PrabhatNeural");
            return res.status(200).json({
                success: true,
                data: {
                    audioBase64: result.audioBase64,
                    format: "audio/mp3",
                    voiceModel,
                    voiceName: "en-IN-PrabhatNeural"
                }
            });
        }

        // 4. Google Cloud Neural2 / WaveNet
        if (voiceModel === "google-cloud-neural") {
            const result = await synthesizeGoogleSpeech(cleanText, "en-IN-Neural2-B");
            return res.status(200).json({
                success: true,
                data: {
                    audioBase64: result.audioBase64,
                    format: "audio/mp3",
                    voiceModel,
                    voiceName: result.voiceName || "en-IN-Neural2-B"
                }
            });
        }

        // Fallback default: Edge Neerja
        const result = await synthesizeEdgeSpeech(cleanText, "en-IN-NeerjaNeural");
        return res.status(200).json({
            success: true,
            data: {
                audioBase64: result.audioBase64,
                format: "audio/mp3",
                voiceModel: "edge-neural-neerja",
                voiceName: "en-IN-NeerjaNeural"
            }
        });
    } catch (err) {
        console.error("Speech synthesis controller error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to synthesize speech"
        });
    }
};
