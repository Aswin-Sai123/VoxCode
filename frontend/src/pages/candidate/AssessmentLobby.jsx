import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    ArrowRight, 
    Clock, 
    Mic, 
    Volume2, 
    Cpu, 
    AlertCircle, 
    ChevronLeft,
    CheckCircle2,
    Loader2,
    FileText,
    Sparkles,
    FolderGit2,
    CheckCircle,
    Camera,
    UploadCloud,
    Trash2,
    Globe,
    Lock,
    Play,
    Square,
    Sliders,
    MessageSquare,
    Code
} from 'lucide-react';
import { toast } from 'sonner';
import { CardSkeleton } from '../../components/common/Skeleton';
import VoiceModelSelectorModal, { VOICE_MODELS } from '../../components/common/VoiceModelSelectorModal';

const AssessmentLobby = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Resume & Project Discussion Context
    const [resumeText, setResumeText] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [candidateSummary, setCandidateSummary] = useState('');
    const [parsedProjects, setParsedProjects] = useState([]);
    const [isParsingResume, setIsParsingResume] = useState(false);
    const [parseSuccess, setParseSuccess] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    // Voice Model Selection & Audio Diagnostics
    const [selectedVoiceModel, setSelectedVoiceModel] = useState(() => {
        return localStorage.getItem('voxcode_preferred_voice_model') || localStorage.getItem('voxcode_voice_model') || 'edge-neural-neerja';
    });
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    const [isTestingVoice, setIsTestingVoice] = useState(false);
    const [activeAudio, setActiveAudio] = useState(null);
    const [micTesting, setMicTesting] = useState(false);
    const [micVolume, setMicVolume] = useState(0);
    const [micVerified, setMicVerified] = useState(false);
    const [speakerVerified, setSpeakerVerified] = useState(false);
    const micStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const verifyCode = async () => {
            try {
                const res = await api.get(`/assessments/join/${code}`);
                if (res.data.success) {
                    setAssessment(res.data.data);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Could not find an assessment matching this code.');
            } finally {
                setLoading(false);
            }
        };

        const fetchCandidateResume = async () => {
            try {
                const res = await api.get('/candidate/resume');
                if (res.data.success && res.data.data) {
                    if (res.data.data.resumeText) {
                        setResumeText(res.data.data.resumeText);
                    }
                    if (res.data.data.resumeFileName) {
                        setUploadedFile({
                            name: res.data.data.resumeFileName,
                            size: 'Saved Profile Resume'
                        });
                    }
                    if (res.data.data.parsedProjects?.length) {
                        setParsedProjects(res.data.data.parsedProjects);
                    }
                }
            } catch {
                // Non-critical if candidate is guest or endpoint is pending
            }
        };

        verifyCode();
        fetchCandidateResume();
    }, [code]);

    const handleFileUpload = async (file) => {
        if (!file) return;

        const validExtensions = ['.pdf', '.txt', '.docx', '.doc'];
        const lowerName = file.name.toLowerCase();
        const isSupported = validExtensions.some(ext => lowerName.endsWith(ext));
        if (!isSupported) {
            toast.error('Please upload a PDF (.pdf), Word document (.docx), or plain text (.txt) file.');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            toast.error('File size exceeds 20MB limit. Please upload a smaller resume document.');
            return;
        }

        setIsParsingResume(true);
        setParseSuccess(false);
        setUploadedFile({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB'
        });

        const reader = new FileReader();
        reader.onload = async () => {
            const base64Data = reader.result;
            try {
                const res = await api.post('/candidate/resume/upload', {
                    fileBase64: base64Data,
                    mimeType: file.type || 'application/pdf',
                    fileName: file.name
                });

                if (res.data.success) {
                    const data = res.data.data;
                    setResumeText(data.extractedText || '');
                    setParsedProjects(data.projects || []);
                    setCandidateSummary(data.summary || '');
                    setCandidateSkills(data.skills || []);
                    setParseSuccess(true);
                    toast.success('Resume parsed and contextualized with Gemini');
                    setTimeout(() => setParseSuccess(false), 5000);
                }
            } catch (err) {
                console.error('Failed to parse resume document:', err);
                toast.error(err.response?.data?.message || 'Failed to parse resume document with Gemini.');
            } finally {
                setIsParsingResume(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleParseResume = async () => {
        if (!resumeText.trim()) return;
        setIsParsingResume(true);
        setParseSuccess(false);

        try {
            const res = await api.post('/candidate/resume/upload', { resumeText: resumeText.trim() });
            if (res.data.success) {
                const data = res.data.data;
                setParsedProjects(data.projects || []);
                setCandidateSummary(data.summary || '');
                setCandidateSkills(data.skills || []);
                setParseSuccess(true);
                setTimeout(() => setParseSuccess(false), 5000);
            }
        } catch (err) {
            console.error('Failed to parse resume:', err);
        } finally {
            setIsParsingResume(false);
        }
    };

    const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'text'

    // Clean up audio on unmount
    useEffect(() => {
        return () => {
            if (activeAudio) {
                activeAudio.pause();
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
            }
        };
    }, [activeAudio]);

    const handleSelectVoiceModel = (modelId) => {
        setSelectedVoiceModel(modelId);
        try {
            localStorage.setItem('voxcode_preferred_voice_model', modelId);
            localStorage.setItem('voxcode_voice_model', modelId);
            sessionStorage.setItem(`voxcode_voice_model_${code}`, modelId);
        } catch {}
    };

    const playBrowserFallbackAudio = (text, model) => {
        if (!window.speechSynthesis) {
            toast.error('Browser speech synthesis is not supported in this browser.');
            setIsTestingVoice(false);
            return;
        }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.0;
        u.pitch = model?.gender === 'Female' ? 1.15 : 0.95;
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = model?.gender === 'Female'
            ? voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('veena'))
            : voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('rishi') || v.name.toLowerCase().includes('george'));
        if (matchingVoice) u.voice = matchingVoice;
        u.onend = () => {
            setIsTestingVoice(false);
            setSpeakerVerified(true);
        };
        u.onerror = () => {
            setIsTestingVoice(false);
        };
        window.speechSynthesis.speak(u);
        toast.info(`Playing sample via Browser Voice Engine (${model?.name || 'Local'})`);
    };

    const handleTestVoiceAudio = async () => {
        if (isTestingVoice) {
            if (activeAudio) {
                activeAudio.pause();
                setActiveAudio(null);
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            setIsTestingVoice(false);
            return;
        }

        const model = VOICE_MODELS.find(m => m.id === selectedVoiceModel) || VOICE_MODELS[0];
        const sampleText = model.sampleText || "Hello! I am your AI technical interviewer. Can you hear me clearly through your speakers?";
        setIsTestingVoice(true);

        try {
            if (selectedVoiceModel === 'browser-speech') {
                playBrowserFallbackAudio(sampleText, model);
                return;
            }

            const res = await api.post('/tts/synthesize', {
                text: sampleText,
                voiceModel: selectedVoiceModel
            });

            if (res.data.success && res.data.data?.audioBase64) {
                const audio = new Audio(res.data.data.audioBase64);
                setActiveAudio(audio);
                audio.onended = () => {
                    setIsTestingVoice(false);
                    setActiveAudio(null);
                    setSpeakerVerified(true);
                };
                audio.onerror = () => {
                    playBrowserFallbackAudio(sampleText, model);
                };
                await audio.play();
            } else {
                playBrowserFallbackAudio(sampleText, model);
            }
        } catch (err) {
            console.warn('Backend audio synthesis test error, falling back:', err);
            playBrowserFallbackAudio(sampleText, model);
        }
    };

    const handleTestMic = async () => {
        if (micTesting) {
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(t => t.stop());
                micStreamRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
            setMicTesting(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;
            setMicTesting(true);
            setMicVerified(true);
            toast.success('Microphone connected successfully! Speak to test volume levels.');

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let frameId;
            const checkVolume = () => {
                if (!micStreamRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setMicVolume(Math.min(100, Math.round(avg * 1.6)));
                frameId = requestAnimationFrame(checkVolume);
            };
            checkVolume();

            // Automatically complete test after 5 seconds
            setTimeout(() => {
                if (micStreamRef.current) {
                    micStreamRef.current.getTracks().forEach(t => t.stop());
                    micStreamRef.current = null;
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(() => {});
                    audioContextRef.current = null;
                }
                cancelAnimationFrame(frameId);
                setMicTesting(false);
                setMicVolume(0);
            }, 5000);
        } catch (err) {
            console.error('Microphone access denied:', err);
            toast.error('Microphone access denied or not detected. Please enable browser microphone permission.');
            setMicTesting(false);
        }
    };

    const handleStartInterview = () => {
        if (!resumeText.trim()) {
            toast.error('Resume is required. Please upload or paste your resume before starting the assessment.');
            document.getElementById('resume-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        if (assessment?.openingTime && (new Date(assessment.openingTime).getTime() - Date.now()) > 60000) {
            toast.error(`Assessment is not open yet. Scheduled opening time is: ${new Date(assessment.openingTime).toLocaleString()}`);
            return;
        }

        // Persist resume and voice model to session storage
        sessionStorage.setItem(`voxcode_resume_${code}`, resumeText);
        sessionStorage.setItem('voxcode_resume', resumeText);
        sessionStorage.setItem(`voxcode_voice_model_${code}`, selectedVoiceModel);
        try {
            localStorage.setItem('voxcode_preferred_voice_model', selectedVoiceModel);
            localStorage.setItem('voxcode_voice_model', selectedVoiceModel);
        } catch {}

        navigate(`/candidate/interview/${code}`, {
            state: {
                resumeText,
                voiceModel: selectedVoiceModel
            }
        });
    };

    if (loading) {
        return (
            <div className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
                <CardSkeleton className="h-40" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CardSkeleton className="h-64" />
                    <CardSkeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#141419] border border-red-500/20 rounded-xl p-8 space-y-5 text-center">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-base font-semibold text-[#EDEDF0]">Assessment not found</h2>
                        <p className="text-xs text-[#8B8B9E]">{error}</p>
                    </div>
                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="studio-btn-secondary w-full py-2.5 text-xs font-medium"
                    >
                        Back to dashboard
                    </button>
                </div>
            </div>
        );
    }

    const interviewFormat = assessment?.interviewFormat || assessment?.blueprint?.interviewFormat || 'FULL_INTERVIEW';
    const openingTimeMs = assessment?.openingTime ? new Date(assessment.openingTime).getTime() : 0;
    const isNotOpenYet = openingTimeMs > 0 && (openingTimeMs - currentTime) > 60000;
    const timeUntilOpenSec = Math.max(0, Math.floor((openingTimeMs - currentTime) / 1000));

    const formatCountdown = (totalSec) => {
        if (totalSec <= 0) return 'Opening now';
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    };

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-6 pb-32">
            {/* Navigation & Code pill */}
            <div className="flex items-center justify-between">
                <Link
                    to="/candidate/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to dashboard</span>
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#555568]">Assessment Code:</span>
                    <span className="code-chit">
                        {code}
                    </span>
                </div>
            </div>

            {/* Scheduled Assessment Banner */}
            {isNotOpenYet && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start justify-between gap-4 animate-in fade-in duration-200">
                    <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
                            <Clock className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-[#EDEDF0]">Scheduled Assessment</h3>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    Opens in {formatCountdown(timeUntilOpenSec)}
                                </span>
                            </div>
                            <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                This assessment is scheduled to open on <strong className="text-[#EDEDF0]">{new Date(assessment.openingTime).toLocaleString()}</strong>.
                                You can test your microphone, audio, and upload your resume below right now so you are completely prepared to start as soon as it opens.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Assessment Details, Format & Resume Context (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Header Card */}
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 sm:p-8 space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0A0A0B] text-[#8B8B9E] border border-[#232330]">
                                    {assessment.companyName || 'Hiring Team'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {assessment.experienceLevel || 'Mid-Senior'}
                                </span>
                                {assessment.assessmentType === 'MOCK' ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                        <Globe className="w-3 h-3" />
                                        <span>Mock Practice • Full Report Unlocked</span>
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        <Lock className="w-3 h-3" />
                                        <span>Official Assessment • Confidential to Recruiter</span>
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDF0]">
                                {assessment.title || assessment.roleTitle}
                            </h1>
                            <div className="flex items-center gap-4 text-xs text-[#8B8B9E] pt-1">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-[#555568]" />
                                    <span>{assessment.durationMinutes || 30} minutes total</span>
                                </span>
                                <span>•</span>
                                <span>Target Role: {assessment.roleTitle}</span>
                            </div>
                        </div>
                    </div>

                    {/* Resume & Project Discussion Context Card */}
                    <div 
                        id="resume-section" 
                        className={`bg-[#141419] border rounded-xl p-6 space-y-4 transition-all scroll-mt-6 ${
                            !resumeText.trim() 
                                ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.06)]' 
                                : 'border-[#232330]'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-sm font-semibold text-[#EDEDF0] flex items-center gap-2 flex-wrap">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    <span>Resume & Project Experience</span>
                                    {!resumeText.trim() ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Required to Join</span>
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Attached & Ready</span>
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                    Upload your resume (PDF, DOCX, or TXT). Gemini automatically parses your real technical projects, architecture choices, and tech stacks so the AI interviewer asks authentic questions tailored to your experience.
                                </p>
                            </div>

                            {/* Mode Toggle */}
                            <div className="segmented-pill-container flex-shrink-0 text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('file')}
                                    className={`px-2.5 py-1 font-medium transition-all ${
                                        uploadMode === 'file'
                                            ? 'segmented-pill-btn-active'
                                            : 'segmented-pill-btn-inactive'
                                    }`}
                                >
                                    File Upload
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('text')}
                                    className={`px-2.5 py-1 font-medium transition-all ${
                                        uploadMode === 'text'
                                            ? 'segmented-pill-btn-active'
                                            : 'segmented-pill-btn-inactive'
                                    }`}
                                >
                                    Paste Text
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {uploadMode === 'file' ? (
                                <>
                                    {/* Drag & Drop File Zone */}
                                    {!uploadedFile ? (
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={handleFileDrop}
                                            className={`relative border-2 border-dashed rounded-xl p-7 text-center transition-all cursor-pointer ${
                                                isDragging
                                                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5'
                                                    : 'border-[#232330] hover:border-[#38384A] bg-[#0A0A0B]/60'
                                            }`}
                                            onClick={() => document.getElementById('resume-file-input')?.click()}
                                        >
                                            <input
                                                id="resume-file-input"
                                                type="file"
                                                accept=".pdf,.docx,.doc,.txt"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleFileUpload(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                            <div className="flex flex-col items-center space-y-2">
                                                <div className="w-11 h-11 rounded-full bg-[#1C1C24] border border-[#232330] flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                                                    <UploadCloud className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-semibold text-[#EDEDF0]">
                                                        Drop your resume here, or <span className="text-emerald-400 hover:underline">browse files</span>
                                                    </p>
                                                    <p className="text-[11px] text-[#555568]">
                                                        Supports PDF, DOCX, or TXT • Max 20MB
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Uploaded File Pill Card */
                                        <div className="p-4 bg-[#0A0A0B] border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-[#EDEDF0] truncate">
                                                        {uploadedFile.name}
                                                    </p>
                                                    <p className="text-[11px] text-[#8B8B9E] flex items-center gap-2">
                                                        <span>{uploadedFile.size}</span>
                                                        <span>•</span>
                                                        <span className="text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Parsed with Gemini</span>
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById('resume-file-input')?.click()}
                                                    className="studio-btn-secondary text-[11px] py-1 px-2.5 text-[#EDEDF0]"
                                                >
                                                    Replace
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUploadedFile(null);
                                                        setResumeText('');
                                                        setParsedProjects([]);
                                                        setCandidateSummary('');
                                                    }}
                                                    className="p-1.5 rounded-lg bg-[#141419] border border-[#232330] text-[#8B8B9E] hover:text-red-400 hover:border-red-500/30 transition-colors"
                                                    title="Remove resume"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <input
                                                    id="resume-file-input"
                                                    type="file"
                                                    accept=".pdf,.docx,.doc,.txt"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handleFileUpload(e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Plain Text Fallback Area */
                                <div className="space-y-2">
                                    <div className="relative">
                                        <textarea
                                            value={resumeText}
                                            onChange={(e) => setResumeText(e.target.value)}
                                            rows={4}
                                            placeholder="Paste your resume summary, LinkedIn profile, or project bullet points..."
                                            className="w-full bg-[#0A0A0B] border border-[#232330] rounded-xl p-3.5 text-xs text-[#EDEDF0] placeholder-[#555568] focus:outline-none focus:border-emerald-500/50 leading-relaxed font-sans resize-y"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleParseResume}
                                            disabled={isParsingResume || !resumeText.trim()}
                                            className="studio-btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-2 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                                        >
                                            {isParsingResume ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Extracting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>Parse Text</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Parsing Loading State */}
                            {isParsingResume && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400 animate-pulse font-medium">
                                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                    <span>Gemini is analyzing your resume document and extracting project architecture...</span>
                                </div>
                            )}

                            {/* Parse Success Notification */}
                            {parseSuccess && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>Resume parsed successfully! The interviewer will tailor questions around your projects.</span>
                                </div>
                            )}

                            {/* Candidate Summary */}
                            {candidateSummary && (
                                <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B8B9E] block">
                                        Candidate Profile Overview
                                    </span>
                                    <p className="text-[#EDEDF0] leading-relaxed">
                                        {candidateSummary}
                                    </p>
                                </div>
                            )}

                            {/* Render Parsed Projects Cards if available */}
                            {parsedProjects.length > 0 && (
                                <div className="pt-2 space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B8B9E] block">
                                        Detected Projects for Interview Deep-Dive ({parsedProjects.length})
                                    </span>
                                    <div className="grid grid-cols-1 gap-2">
                                        {parsedProjects.map((p, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg space-y-1.5 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-[#EDEDF0] flex items-center gap-1.5">
                                                        <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span>{p.title}</span>
                                                    </span>
                                                    {p.techStack && p.techStack.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {p.techStack.slice(0, 4).map((t, ti) => (
                                                                <span
                                                                    key={ti}
                                                                    className="px-1.5 py-0.5 rounded bg-[#1C1C24] text-[10px] text-[#8B8B9E] border border-[#232330]"
                                                                >
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {p.description && (
                                                    <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                                        {p.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Interview Overview & Preparation Tips */}
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-[#EDEDF0]">
                            Interview Overview & Guidelines
                        </h2>
                        
                        <div className="space-y-3">
                            <div className="p-4 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-start gap-3.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-blue-400">
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-[#EDEDF0]">
                                            Technical Discussion & Architecture
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                        Conversational dialogue with your engineering interviewer. You will discuss your project experiences, architectural decisions, and trade-offs.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-start gap-3.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-emerald-400">
                                    <Code className="w-4 h-4" />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-[#EDEDF0]">
                                            Collaborative Problem Solving
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                        Work together on technical problems in a shared coding workspace. Focus on clean code, explaining your thought process, and evaluating time/space complexity.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Readiness Checklist & CTA (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 sm:p-7 space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-sm font-semibold text-[#EDEDF0]">
                                Setup Checklist
                            </h2>
                            <p className="text-xs text-[#8B8B9E]">
                                Verify audio and workspace readiness before entering the interview room.
                            </p>
                        </div>

                        {/* Time Window Specification */}
                        {(assessment.openingTime || assessment.closingTime) && (
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs space-y-1">
                                <span className="text-[#EDEDF0] font-medium block">Assessment Window</span>
                                {assessment.openingTime && (
                                    <p className="text-[#8B8B9E]">
                                        Opens: <span className="text-[#EDEDF0]">{new Date(assessment.openingTime).toLocaleString()}</span>
                                    </p>
                                )}
                                {assessment.closingTime && (
                                    <p className="text-[#8B8B9E]">
                                        Expires: <span className="text-amber-400">{new Date(assessment.closingTime).toLocaleString()}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs text-[#8B8B9E] space-y-1">
                            <span className="text-[#EDEDF0] font-medium block">Session Guidelines</span>
                            <p className="text-[11px] leading-relaxed">
                                Join from a quiet environment with a stable internet connection. Your voice audio and code workspace are synchronized throughout the interview.
                            </p>
                        </div>

                        {/* AI Voice Model Selector Card */}
                        <div className="p-4 bg-[#0A0A0B] border border-blue-500/30 rounded-xl space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                                        <Volume2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-xs font-semibold text-[#EDEDF0] block">
                                            Interviewer Voice Model
                                        </span>
                                        <span className="text-[11px] text-blue-400 font-medium truncate block">
                                            {VOICE_MODELS.find(m => m.id === selectedVoiceModel)?.name || 'Microsoft Edge Neural — Neerja'}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                                    100% Free
                                </span>
                            </div>

                            {/* Buttons to Test Voice & Change Voice Model */}
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleTestVoiceAudio}
                                    className="flex-1 studio-btn-secondary text-xs py-2 flex items-center justify-center gap-2 text-[#EDEDF0] hover:text-white"
                                >
                                    {isTestingVoice ? (
                                        <>
                                            <Square className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                            <span className="text-amber-400 font-medium">Stop Audio</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                                            <span>Test Voice</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsVoiceModalOpen(true)}
                                    className="flex-1 studio-btn-secondary text-xs py-2 flex items-center justify-center gap-2 text-[#EDEDF0] hover:border-blue-500/40"
                                >
                                    <Sliders className="w-3.5 h-3.5 text-[#8B8B9E]" />
                                    <span>Change Voice</span>
                                </button>
                            </div>
                        </div>

                        {/* Checklist */}
                        <div className="space-y-2.5">
                            {/* Microphone Check */}
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                        <Mic className="w-4 h-4 text-blue-400" />
                                        <span>Microphone (Voice Dialogue)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {micVerified && (
                                            <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Verified</span>
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleTestMic}
                                            className="studio-btn-secondary text-[11px] py-1 px-2.5 text-[#EDEDF0]"
                                        >
                                            {micTesting ? 'Listening...' : 'Test Mic'}
                                        </button>
                                    </div>
                                </div>
                                {micTesting && (
                                    <div className="space-y-1 pt-1 animate-in fade-in">
                                        <div className="flex justify-between text-[10px] text-[#8B8B9E]">
                                            <span>Speak into your mic:</span>
                                            <span className="font-mono text-emerald-400">{micVolume}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[#1C1C24] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-400 transition-all duration-75"
                                                style={{ width: `${micVolume}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Speaker Check */}
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                    <Volume2 className="w-4 h-4 text-blue-400" />
                                    <span>Audio Output & Speaker</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {speakerVerified && (
                                        <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Working</span>
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleTestVoiceAudio}
                                        className="studio-btn-secondary text-[11px] py-1 px-2.5 text-[#EDEDF0]"
                                    >
                                        {isTestingVoice ? 'Playing...' : 'Test Speaker'}
                                    </button>
                                </div>
                            </div>

                            {/* Camera & Video Check */}
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                    <Camera className="w-4 h-4 text-blue-400" />
                                    <span>Camera & Video</span>
                                </div>
                                <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Ready</span>
                                </span>
                            </div>

                            {/* Collaborative Code Workspace */}
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                    <Cpu className="w-4 h-4 text-blue-400" />
                                    <span>
                                        {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                            ? 'Interactive System Architecture Workspace'
                                            : 'Interactive Code Workspace'}
                                    </span>
                                </div>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>

                            {/* Resume Context */}
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                    <FileText className={`w-4 h-4 ${resumeText.trim() ? 'text-emerald-400' : 'text-amber-400'}`} />
                                    <span>Candidate Resume</span>
                                </div>
                                {resumeText.trim() ? (
                                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                        Attached
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 animate-pulse">
                                        Required
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Assessment Guide card */}
                        <div className="p-3.5 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[#8B8B9E]">Interviewer:</span>
                                <span className="font-medium text-[#EDEDF0]">
                                    Rohan (AI Lead Engineer)
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#8B8B9E]">Selected Voice:</span>
                                <span className="text-blue-400 font-medium font-mono text-[11px]">
                                    {selectedVoiceModel === 'edge-neural-neerja' ? 'Neerja (Female)' : selectedVoiceModel === 'edge-neural-prabhat' ? 'Prabhat (Male)' : selectedVoiceModel === 'browser-speech' ? 'Browser Native' : 'Google Neural'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#8B8B9E]">Resume Status:</span>
                                <span className={resumeText.trim() ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                                    {resumeText.trim() ? 'Attached & Parsed' : 'Upload Required'}
                                </span>
                            </div>
                        </div>

                        {/* Launch Action */}
                        <div className="pt-2 space-y-2">
                            <button
                                onClick={handleStartInterview}
                                disabled={!resumeText.trim() || isNotOpenYet}
                                className={`w-full py-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                                    !resumeText.trim() || isNotOpenYet
                                        ? 'bg-[#1C1C24] text-[#8B8B9E] border border-[#2E2E3D] cursor-not-allowed'
                                        : 'btn-primary'
                                }`}
                            >
                                {isNotOpenYet ? (
                                    <>
                                        <Clock className="w-4 h-4 text-blue-400" />
                                        <span>Opens in {formatCountdown(timeUntilOpenSec)} ({new Date(assessment.openingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                                    </>
                                ) : !resumeText.trim() ? (
                                    <>
                                        <FileText className="w-4 h-4 text-amber-400" />
                                        <span>Upload Resume to Start</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Start Interview</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                            <span className="text-[11px] text-[#555568] text-center block">
                                {!resumeText.trim() 
                                    ? 'Resume document is mandatory to join this assessment'
                                    : isNotOpenYet
                                    ? `Scheduled opening: ${new Date(assessment.openingTime).toLocaleString()}`
                                    : `Duration: approximately ${assessment.durationMinutes || 30} minutes`
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Voice Model Selector Modal */}
            <VoiceModelSelectorModal
                isOpen={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                selectedVoiceModel={selectedVoiceModel}
                onSelectVoiceModel={handleSelectVoiceModel}
            />
        </div>
    );
};

export default AssessmentLobby;
