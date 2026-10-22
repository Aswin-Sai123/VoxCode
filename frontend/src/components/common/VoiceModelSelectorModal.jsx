import React, { useState } from 'react';
import { 
    Volume2, 
    Check, 
    X, 
    Sparkles, 
    Zap, 
    ShieldCheck, 
    Play, 
    Square, 
    Loader2, 
    HelpCircle 
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

export const VOICE_MODELS = [
    {
        id: "edge-neural-neerja",
        name: "Microsoft Edge Neural — Neerja",
        gender: "Female",
        locale: "en-IN (Indian English)",
        engine: "Edge Online Neural",
        cost: "$0 (100% Free)",
        limits: "Unlimited usage forever. Zero API keys required.",
        badge: "Recommended • 100% Free",
        badgeColor: "emerald",
        features: ["Ultra-realistic natural cadence", "Zero setup or API keys", "Crisp studio quality"],
        sampleText: "Hello! I am Neerja, your technical interviewer. Let's explore your system design and coding skills."
    },
    {
        id: "edge-neural-prabhat",
        name: "Microsoft Edge Neural — Prabhat",
        gender: "Male",
        locale: "en-IN (Indian English)",
        engine: "Edge Online Neural",
        cost: "$0 (100% Free)",
        limits: "Unlimited usage forever. Zero API keys required.",
        badge: "100% Free • Male Voice",
        badgeColor: "blue",
        features: ["Deep, professional tone", "High-clarity technical explanations", "No quota caps"],
        sampleText: "Hi there! I'm Prabhat. I'll be guiding you through today's technical algorithms and architecture round."
    },
    {
        id: "browser-speech",
        name: "Browser Web Speech API",
        gender: "System Dependent",
        locale: "Client OS (en-IN / en-US)",
        engine: "Browser Native SpeechSynthesis",
        cost: "$0 (100% Free)",
        limits: "Runs locally on your browser. Zero network delay.",
        badge: "Zero Network Latency",
        badgeColor: "amber",
        features: ["Instant offline response", "Client-side execution", "Matches browser engine"],
        sampleText: "This voice runs directly inside your browser engine with instant zero-latency playback."
    },
    {
        id: "google-cloud-neural",
        name: "Google Cloud TTS (Neural2 / WaveNet)",
        gender: "Dynamic",
        locale: "en-IN (Indian English)",
        engine: "Google Cloud Neural2",
        cost: "Free Tier (1M chars/mo)",
        limits: "1,000,000 characters free each month (~15-20 full interviews). Then $0.000016/char.",
        badge: "GCP Free Tier",
        badgeColor: "purple",
        features: ["DeepMind WaveNet architecture", "High benchmark expressiveness", "Cloud enterprise grade"],
        sampleText: "This is Google Cloud's deep neural synthesizer trained with state of the art speech models."
    }
];

const VoiceModelSelectorModal = ({ 
    isOpen, 
    onClose, 
    selectedVoiceModel, 
    onSelectVoiceModel,
    onTestBrowserVoice
}) => {
    const [testingModelId, setTestingModelId] = useState(null);
    const [audioElement, setAudioElement] = useState(null);

    if (!isOpen) return null;

    const stopCurrentAudio = () => {
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            setAudioElement(null);
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setTestingModelId(null);
    };

    const handleTestVoice = async (model) => {
        stopCurrentAudio();
        setTestingModelId(model.id);

        try {
            if (model.id === 'browser-speech') {
                if (onTestBrowserVoice) {
                    onTestBrowserVoice(model.sampleText);
                } else if (window.speechSynthesis) {
                    const u = new SpeechSynthesisUtterance(model.sampleText);
                    u.rate = 1.05;
                    u.pitch = 0.98;
                    const voices = window.speechSynthesis.getVoices();
                    const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('Rishi') || v.name.includes('Veena')) || voices[0];
                    if (indianVoice) u.voice = indianVoice;
                    u.onend = () => setTestingModelId(null);
                    u.onerror = () => setTestingModelId(null);
                    window.speechSynthesis.speak(u);
                }
                return;
            }

            const res = await api.post('/tts/synthesize', {
                text: model.sampleText,
                voiceModel: model.id
            });

            if (res.data.success && res.data.data?.audioBase64) {
                const audio = new Audio(res.data.data.audioBase64);
                setAudioElement(audio);
                audio.onended = () => {
                    setTestingModelId(null);
                    setAudioElement(null);
                };
                audio.onerror = () => {
                    toast.error('Failed to play sample voice');
                    setTestingModelId(null);
                    setAudioElement(null);
                };
                await audio.play();
            } else {
                toast.error('Could not synthesize sample voice');
                setTestingModelId(null);
            }
        } catch (err) {
            console.error('Test voice error:', err);
            toast.error(err.response?.data?.message || 'Error testing voice model');
            setTestingModelId(null);
        }
    };

    const handleSelect = (modelId) => {
        stopCurrentAudio();
        onSelectVoiceModel(modelId);
        const model = VOICE_MODELS.find(m => m.id === modelId);
        toast.success(`Active voice switched to: ${model?.name || modelId}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#141419] border border-[#232330] rounded-2xl max-w-3xl w-full p-6 sm:p-7 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto light-catch">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#232330]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Volume2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold metallic-heading">
                                Choose Interviewer Voice Model
                            </h2>
                            <p className="text-xs text-[#8B8B9E]">
                                Test and select the speech engine used when Rohan speaks and repeats questions.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            stopCurrentAudio();
                            onClose();
                        }}
                        className="p-1.5 rounded-lg text-[#8B8B9E] hover:text-[#EDEDF0] hover:bg-[#1C1C24] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Grid of Voice Models */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {VOICE_MODELS.map((model) => {
                        const isSelected = selectedVoiceModel === model.id;
                        const isPlaying = testingModelId === model.id;

                        return (
                            <div
                                key={model.id}
                                className={`rounded-xl p-5 border transition-all flex flex-col justify-between space-y-4 relative ${
                                    isSelected
                                        ? 'border-blue-500/60 bg-blue-500/5 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/30'
                                        : 'border-[#232330] bg-[#0A0A0B]/60 hover:border-[#38384A]'
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                                            model.badgeColor === 'emerald'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : model.badgeColor === 'blue'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : model.badgeColor === 'purple'
                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                            {model.badge}
                                        </span>

                                        <span className="text-xs font-mono font-bold text-emerald-400">
                                            {model.cost}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-[#EDEDF0]">
                                            {model.name}
                                        </h3>
                                        <p className="text-[11px] text-[#8B8B9E] mt-0.5">
                                            {model.locale} • {model.gender}
                                        </p>
                                    </div>

                                    <div className="bg-[#141419] border border-[#232330] rounded-lg p-2.5 space-y-1 text-[11px] text-[#8B8B9E]">
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-[#EDEDF0] font-medium min-w-[45px]">Limits:</span>
                                            <span>{model.limits}</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-1 text-[11px] text-[#8B8B9E]">
                                        {model.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-[#232330]">
                                    <button
                                        type="button"
                                        onClick={() => (isPlaying ? stopCurrentAudio() : handleTestVoice(model))}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                                            isPlaying
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                : 'bg-[#141419] text-[#EDEDF0] border-[#232330] hover:bg-[#1C1C24]'
                                        }`}
                                    >
                                        {isPlaying ? (
                                            <>
                                                <Square className="w-3.5 h-3.5 fill-current" />
                                                <span>Stop</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-3.5 h-3.5" />
                                                <span>Test Voice</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSelect(model.id)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                                            isSelected
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'btn-primary'
                                        }`}
                                    >
                                        {isSelected ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Active</span>
                                            </>
                                        ) : (
                                            <span>Select Voice</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Notice */}
                <div className="bg-[#0A0A0B] border border-[#232330] rounded-xl p-3.5 flex items-center gap-3 text-xs text-[#8B8B9E]">
                    <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>
                        Selected voice model is saved automatically. When you click <strong>"Repeat Question"</strong> or the interviewer asks a new question, it will immediately redirect and synthesize with your chosen model.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VoiceModelSelectorModal;
