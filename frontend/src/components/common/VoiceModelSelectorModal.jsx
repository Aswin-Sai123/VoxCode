import React, { useState, useRef } from 'react';
import { 
    Volume2, 
    Check, 
    X, 
    Play, 
    Square 
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

export const VOICE_MODELS = [
    {
        id: "edge-neural-neerja",
        name: "Microsoft Edge Neural — Neerja",
        gender: "Female",
        locale: "en-IN (Indian English)",
        sampleText: "Hello! I am Neerja, your technical interviewer. Let's explore your system design and coding skills."
    },
    {
        id: "edge-neural-prabhat",
        name: "Microsoft Edge Neural — Prabhat",
        gender: "Male",
        locale: "en-IN (Indian English)",
        sampleText: "Hi there! I'm Prabhat. I'll be guiding you through today's technical algorithms and architecture round."
    },
    {
        id: "browser-speech",
        name: "Browser Web Speech API",
        gender: "System Dependent",
        locale: "Client OS",
        sampleText: "This voice runs directly inside your browser engine with instant zero-latency playback."
    },
    {
        id: "google-cloud-neural",
        name: "Google Cloud TTS (Neural2 / WaveNet)",
        gender: "Dynamic",
        locale: "en-IN (Indian English)",
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
    const audioRef = useRef(null);

    if (!isOpen) return null;

    const stopCurrentAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setTestingModelId(null);
    };

    const playBrowserFallback = (model) => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(model.sampleText);
            u.rate = 1.0;
            u.pitch = model.gender === 'Female' ? 1.15 : 0.95;
            const voices = window.speechSynthesis.getVoices();
            const matchingVoice = model.gender === 'Female' 
                ? voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('veena'))
                : voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('rishi') || v.name.toLowerCase().includes('george'));
            if (matchingVoice) u.voice = matchingVoice;
            u.onend = () => setTestingModelId(null);
            u.onerror = () => setTestingModelId(null);
            window.speechSynthesis.speak(u);
            toast.info(`Playing sample via Browser Voice Engine (${model.name})`);
        } else {
            toast.error('Voice playback not supported by browser');
            setTestingModelId(null);
        }
    };

    const handleTestVoice = async (model) => {
        stopCurrentAudio();
        setTestingModelId(model.id);

        try {
            if (model.id === 'browser-speech') {
                if (onTestBrowserVoice) {
                    onTestBrowserVoice(model.sampleText);
                } else {
                    playBrowserFallback(model);
                }
                return;
            }

            const res = await api.post('/tts/synthesize', {
                text: model.sampleText,
                voiceModel: model.id
            });

            if (res.data.success && res.data.data?.audioBase64) {
                const audio = new Audio(res.data.data.audioBase64);
                audioRef.current = audio;
                audio.onended = () => {
                    setTestingModelId(null);
                    audioRef.current = null;
                };
                audio.onerror = () => {
                    audioRef.current = null;
                    playBrowserFallback(model);
                };
                await audio.play();
            } else {
                playBrowserFallback(model);
            }
        } catch (err) {
            console.warn('Test voice fallback:', err);
            playBrowserFallback(model);
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
            <div className="bg-[#141419] border border-[#232330] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl light-catch">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#232330]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Volume2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-[#EDEDF0] metallic-heading">
                                Choose Interviewer Voice Model
                            </h2>
                            <p className="text-xs text-[#8B8B9E]">
                                Select the voice model used during spoken interview sessions.
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VOICE_MODELS.map((model) => {
                        const isSelected = selectedVoiceModel === model.id;
                        const isPlaying = testingModelId === model.id;

                        return (
                            <div
                                key={model.id}
                                className={`rounded-xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                                    isSelected
                                        ? 'border-blue-500/60 bg-blue-500/5 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/30'
                                        : 'border-[#232330] bg-[#0A0A0B]/60 hover:border-[#38384A]'
                                }`}
                            >
                                <div>
                                    <h3 className="text-sm font-semibold text-[#EDEDF0]">
                                        {model.name}
                                    </h3>
                                    <p className="text-xs text-[#8B8B9E] mt-0.5">
                                        {model.gender} • {model.locale}
                                    </p>
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
            </div>
        </div>
    );
};

export default VoiceModelSelectorModal;
