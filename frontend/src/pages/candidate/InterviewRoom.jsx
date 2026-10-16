import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { 
    Terminal, 
    Mic, 
    MicOff, 
    Volume2, 
    VolumeX, 
    Play, 
    Clock, 
    Send, 
    RotateCcw, 
    ArrowRight, 
    CheckCircle2, 
    AlertCircle, 
    Code2, 
    MessageSquare, 
    ChevronRight,
    Copy,
    Check,
    Maximize2,
    Minimize2,
    FileText,
    Sparkles
} from 'lucide-react';

const InterviewRoom = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    // Session state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [session, setSession] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [stage, setStage] = useState('CONCEPTUAL'); // 'CONCEPTUAL' | 'CODING' | 'COMPLETED'
    const [transcript, setTranscript] = useState([]);
    const [latestAiMessage, setLatestAiMessage] = useState('');

    // Timer state
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(1800); // default 30m

    // Voice & Input state
    const [isListening, setIsListening] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [candidateText, setCandidateText] = useState('');
    const [interimSpeech, setInterimSpeech] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showTextInput, setShowTextInput] = useState(false);

    // Coding state
    const [codingChallenge, setCodingChallenge] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [editorCode, setEditorCode] = useState('// Write your solution here\n');
    const [executionOutput, setExecutionOutput] = useState('');
    const [isRunningCode, setIsRunningCode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [transitionBanner, setTransitionBanner] = useState(false);

    // HackerRank IDE Tabs & Console state
    const [leftTab, setLeftTab] = useState('problem'); // 'problem' | 'guidance'
    const [consoleTab, setConsoleTab] = useState('testcases'); // 'testcases' | 'results'
    const [activeTestCase, setActiveTestCase] = useState(0);
    const [useCustomInput, setUseCustomInput] = useState(false);
    const [customInputText, setCustomInputText] = useState('');
    const [executionDetails, setExecutionDetails] = useState({ hasError: false, executionTime: '', output: '' });
    const [copySuccessIndex, setCopySuccessIndex] = useState(null);

    // Resizable split panels & console sliders
    const [leftPanelWidth, setLeftPanelWidth] = useState(45); // percentage
    const [consoleHeight, setConsoleHeight] = useState(250); // pixels
    const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
    const [isDraggingVertical, setIsDraggingVertical] = useState(false);
    const rightPanelRef = useRef(null);

    // Refs
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);
    const isMutedRef = useRef(false);
    const utteranceRef = useRef(null);

    // Split-panel and console drag listener
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingHorizontal) {
                const newWidthPct = (e.clientX / window.innerWidth) * 100;
                if (newWidthPct >= 25 && newWidthPct <= 75) {
                    setLeftPanelWidth(newWidthPct);
                }
            } else if (isDraggingVertical && rightPanelRef.current) {
                const rect = rightPanelRef.current.getBoundingClientRect();
                const newHeight = rect.bottom - e.clientY;
                const maxHeight = Math.max(160, window.innerHeight - 150);
                if (newHeight >= 80 && newHeight <= Math.min(650, maxHeight)) {
                    setConsoleHeight(newHeight);
                }
            }
        };

        const handleMouseUp = () => {
            if (isDraggingHorizontal) setIsDraggingHorizontal(false);
            if (isDraggingVertical) setIsDraggingVertical(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        if (isDraggingHorizontal || isDraggingVertical) {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = isDraggingHorizontal ? 'col-resize' : 'row-resize';
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingHorizontal, isDraggingVertical]);

    // 1. Initialize interview session
    useEffect(() => {
        const initInterview = async () => {
            try {
                const res = await api.post(`/interview/start/${code}`);
                if (res.data.success) {
                    const data = res.data.data;
                    setSession(data.session);
                    setAssessment(data.assessment);
                    setStage(data.session.stage || 'CONCEPTUAL');
                    setTranscript(data.session.transcript || []);
                    setTimeLeftSeconds((data.assessment.durationMinutes || 30) * 60);

                    // Find latest AI message
                    const aiMsgs = data.session.transcript.filter(t => t.role === 'ai');
                    if (aiMsgs.length > 0) {
                        const firstMsg = aiMsgs[aiMsgs.length - 1].text;
                        setLatestAiMessage(firstMsg);
                        speakAiMessage(firstMsg);
                    }

                    if (data.session.codingChallenge) {
                        setCodingChallenge(data.session.codingChallenge);
                        setEditorCode(data.session.codingChallenge.starterCode || '// Write your code here');
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to start interview session');
            } finally {
                setLoading(false);
            }
        };

        initInterview();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, [code]);

    // 2. Countdown Timer
    useEffect(() => {
        if (!session || stage === 'COMPLETED') return;

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeftSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [session, stage]);

    // 3. Audio Output (TTS) with Indian Accent Preference
    const speakAiMessage = (text) => {
        if (!text || isMutedRef.current || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();

        const cleanText = text.replace(/[*_#`]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utteranceRef.current = utterance;

        const setVoiceAndSpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const indianVoice = voices.find(v =>
                    (v.lang === 'en-IN' || v.lang === 'hi-IN') &&
                    (v.name.includes('Rishi') || v.name.includes('Veena') || v.name.includes('India') || v.name.includes('Google हिन्दी'))
                ) || voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));

                if (indianVoice) utterance.voice = indianVoice;
            }

            utterance.rate = 1.05;
            utterance.pitch = 0.98;

            utterance.onstart = () => setIsAiSpeaking(true);
            utterance.onend = () => {
                setIsAiSpeaking(false);
                utteranceRef.current = null;
            };
            utterance.onerror = (e) => {
                console.warn('TTS warning:', e);
                setIsAiSpeaking(false);
                utteranceRef.current = null;
            };

            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            setVoiceAndSpeak();
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                setVoiceAndSpeak();
                window.speechSynthesis.onvoiceschanged = null;
            };
        }
    };

    // 4. Speech Recognition with Barge-In Capability
    const toggleSpeechRecognition = () => {
        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                setIsListening(false);
            }
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setShowTextInput(true);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setInterimSpeech('');
        };

        recognition.onresult = (event) => {
            // Barge-in: cut off AI immediately
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsAiSpeaking(false);
                if (utteranceRef.current) utteranceRef.current = null;
            }

            let finalStr = '';
            let interimStr = '';
            for (let i = 0; i < event.results.length; i++) {
                const transcriptPiece = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalStr += transcriptPiece + ' ';
                } else {
                    interimStr += transcriptPiece;
                }
            }
            if (finalStr) {
                setCandidateText(prev => (prev ? prev + ' ' + finalStr : finalStr));
            }
            setInterimSpeech(interimStr);
        };

        recognition.onerror = (e) => {
            console.error('Speech recognition error', e);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimSpeech('');
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // 5. Send Candidate Answer to Backend + Gemini
    const handleSendMessage = async (customText) => {
        const textToSend = (customText || candidateText || interimSpeech).trim();
        if (!textToSend || isSending) return;

        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsAiSpeaking(false);

        setIsSending(true);
        setCandidateText('');
        setInterimSpeech('');

        const userEntry = { role: 'candidate', text: textToSend, timestamp: new Date() };
        setTranscript(prev => [...prev, userEntry]);

        try {
            const res = await api.post('/interview/message', {
                sessionId: session?._id,
                code,
                message: textToSend,
                currentCode: editorCode,
                executionOutput: executionOutput
            });

            if (res.data.success) {
                const { aiMessage, stage: newStage, codingChallenge: newChallenge, transcript: updatedTranscript } = res.data.data;
                setLatestAiMessage(aiMessage);
                if (updatedTranscript) setTranscript(updatedTranscript);

                if (newStage === 'CODING' && stage !== 'CODING') {
                    setTransitionBanner(true);
                    setStage('CODING');
                    if (newChallenge) {
                        setCodingChallenge(newChallenge);
                        setEditorCode(newChallenge.starterCode || '// Write your code here');
                        setSelectedLanguage(newChallenge.language || 'javascript');
                    }
                    setTimeout(() => setTransitionBanner(false), 5000);
                }

                speakAiMessage(aiMessage);
            }
        } catch (err) {
            console.error('Failed to send answer', err);
            const errorMsg = 'Could not get response from AI interviewer. Please try sending again.';
            setTranscript(prev => [...prev, { role: 'ai', text: errorMsg, timestamp: new Date() }]);
        } finally {
            setIsSending(false);
        }
    };

    // 6. Run Code (Sub-second Native Sandbox Runner)
    const handleRunCode = async () => {
        setIsRunningCode(true);
        setConsoleTab('results');
        setExecutionOutput('Compiling and executing code against sandbox test cases...');
        try {
            const res = await api.post('/interview/run-code', {
                language: selectedLanguage,
                code: editorCode,
                customInput: useCustomInput ? customInputText : undefined
            });
            if (res.data.success) {
                const out = res.data.data.output || 'Code executed with no stdout output.';
                setExecutionOutput(out);
                setExecutionDetails({
                    hasError: res.data.data.hasError || false,
                    executionTime: res.data.data.executionTime || '0.20s',
                    output: out
                });
            }
        } catch (err) {
            const errMsg = `Execution failed: ${err.response?.data?.message || err.message}`;
            setExecutionOutput(errMsg);
            setExecutionDetails({
                hasError: true,
                executionTime: '0.00s',
                output: errMsg
            });
        } finally {
            setIsRunningCode(false);
        }
    };

    // 7. Submit Assessment (Two-Step Non-blocking confirmation)
    const handleSubmitInterview = async (force = false) => {
        if (!force && !confirmSubmit) {
            setConfirmSubmit(true);
            setTimeout(() => setConfirmSubmit(false), 6000);
            return;
        }
        setConfirmSubmit(false);
        setIsSubmitting(true);
        try {
            await api.post('/interview/submit', {
                sessionId: session?._id,
                code,
                codeSubmission: {
                    language: selectedLanguage,
                    code: editorCode,
                    output: executionOutput
                }
            });
            setStage('COMPLETED');
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (err) {
            alert('Failed to submit interview: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAutoSubmit = async () => {
        try {
            await api.post('/interview/submit', {
                sessionId: session?._id,
                code,
                codeSubmission: {
                    language: selectedLanguage,
                    code: editorCode,
                    output: executionOutput
                }
            });
            setStage('COMPLETED');
        } catch (err) {
            console.error('Auto submit error', err);
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="h-screen bg-[#09090B] flex flex-col items-center justify-center font-mono text-xs text-[#71717A] space-y-3">
                <div className="w-5 h-5 border-2 border-[#FAFAFA] border-t-transparent rounded-full animate-spin"></div>
                <span>INITIALIZING AUTONOMOUS INTERVIEW STUDIO // {code}...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen bg-[#09090B] flex items-center justify-center p-6">
                <div className="bg-[#111114] border border-[#F43F5E]/30 rounded-md p-6 max-w-sm w-full text-center space-y-4 font-mono">
                    <AlertCircle className="w-6 h-6 text-[#F43F5E] mx-auto" />
                    <div>
                        <p className="text-xs font-semibold text-[#FAFAFA]">Interview Room Exception</p>
                        <p className="text-[11px] text-[#71717A] mt-1">{error}</p>
                    </div>
                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="studio-btn-secondary w-full py-2 text-xs"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // 8. Stage 3: Completed Evaluation Screen
    if (stage === 'COMPLETED') {
        return (
            <div className="h-screen bg-[#09090B] flex items-center justify-center p-6">
                <div className="bg-[#111114] border border-[#222228] rounded-md p-8 max-w-lg w-full text-center space-y-6">
                    <div className="w-10 h-10 rounded bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mx-auto text-[#10B981]">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                        <span className="studio-badge bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25">
                            EVALUATION COMPLETED
                        </span>
                        <h2 className="text-xl font-semibold text-[#FAFAFA] tracking-tight">
                            Assessment Successfully Recorded
                        </h2>
                        <p className="text-xs text-[#71717A] font-mono">
                            Your dialogue exchanges and multi-language code submission have been autonomously graded by Gemini 2.5 Flash.
                        </p>
                    </div>

                    <div className="bg-[#09090B] border border-[#222228] rounded p-4 text-left font-mono text-xs space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[#52525B]">ROLE SPECIFICATION:</span>
                            <span className="text-[#FAFAFA] font-medium">{assessment?.roleTitle || assessment?.title}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#52525B]">EVALUATION ENTITY:</span>
                            <span className="text-[#A1A1AA]">{assessment?.companyName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#52525B]">CONVERSATION TURNS:</span>
                            <span className="text-[#10B981] font-semibold tabular-nums">{transcript.length} messages</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#52525B]">RUNTIME ENVIRONMENT:</span>
                            <span className="text-[#FAFAFA] font-medium uppercase">{selectedLanguage}</span>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <button
                            onClick={() => navigate(`/candidate/report/${session?._id}`)}
                            className="studio-btn-primary w-full py-2.5 text-xs font-mono font-semibold"
                        >
                            <span>Open Performance Evaluation Dossier</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => navigate('/candidate/dashboard')}
                            className="studio-btn-secondary w-full py-2 text-xs font-mono"
                        >
                            Return to Command Center
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-[#09090B] text-[#FAFAFA] font-sans select-none">
            {/* Transition Alert Strip */}
            {transitionBanner && (
                <div className="h-8 bg-[#18181C] border-b border-[#F59E0B]/40 px-4 flex items-center justify-between font-mono text-xs text-[#F59E0B]">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping"></span>
                        <span>[TRANSITION] Practical Coding Round Initialized — Code Workspace Unlocked.</span>
                    </span>
                    <span className="text-[10px] text-[#71717A]">STAGE 02 // CODING</span>
                </div>
            )}

            {/* Top Studio Bar (h-11) */}
            <header className="h-11 border-b border-[#222228] bg-[#09090B] px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-40">
                {/* Left: Studio Identity & Role */}
                <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold tracking-wider text-[#FAFAFA] uppercase">
                        VoxCode // Studio
                    </span>
                    <span className="text-[#3F3F46] font-mono text-xs">/</span>
                    <span className="font-mono text-[11px] text-[#A1A1AA] truncate max-w-[200px] sm:max-w-xs">
                        {assessment?.title || assessment?.roleTitle}
                    </span>
                </div>

                {/* Center: Phase Badge */}
                <div className="flex items-center gap-3">
                    <span className={`studio-badge ${
                        stage === 'CONCEPTUAL'
                            ? 'bg-[#18181C] text-[#FAFAFA] border-[#3F3F46]'
                            : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25'
                    }`}>
                        {stage === 'CONCEPTUAL' ? 'PHASE 01 // VOICE SCREENING' : 'PHASE 02 // POLYGLOT CODING'}
                    </span>
                </div>

                {/* Right: Timer, Audio Controls & Submit */}
                <div className="flex items-center gap-2.5">
                    {/* Monospace Countdown Timer */}
                    <div className={`px-2.5 py-1 rounded bg-[#111114] border font-mono text-xs font-medium tabular-nums flex items-center gap-1.5 ${
                        timeLeftSeconds < 300
                            ? 'border-[#F59E0B]/40 text-[#F59E0B]'
                            : 'border-[#222228] text-[#FAFAFA]'
                    }`}>
                        <Clock className="w-3.5 h-3.5 text-[#71717A]" />
                        <span>{formatTime(timeLeftSeconds)}</span>
                    </div>

                    {/* Mute Toggle */}
                    <button
                        onClick={() => {
                            const newMuted = !isMuted;
                            isMutedRef.current = newMuted;
                            if (newMuted && window.speechSynthesis) window.speechSynthesis.cancel();
                            setIsMuted(newMuted);
                        }}
                        className="studio-btn-secondary p-1.5"
                        title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
                    >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#F43F5E]" /> : <Volume2 className="w-3.5 h-3.5 text-[#A1A1AA]" />}
                    </button>

                    {/* End & Submit Button */}
                    <button
                        id="submit-interview-btn"
                        onClick={() => handleSubmitInterview()}
                        disabled={isSubmitting}
                        className={`studio-btn-primary text-xs font-mono ${
                            confirmSubmit 
                                ? 'bg-[#F43F5E] text-white hover:bg-[#E11D48] border border-[#F43F5E]' 
                                : 'bg-[#FAFAFA] text-[#09090B]'
                        }`}
                        title="Submit interview assessment for AI evaluation"
                    >
                        {isSubmitting ? 'Evaluating...' : confirmSubmit ? 'Confirm Submit [!]' : 'End Session'}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            {stage === 'CONCEPTUAL' ? (
                /* ================= STAGE 1: IMMERSIVE HARDWARE AUDIO STUDIO ================= */
                <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full space-y-6">
                    {/* Visualizer Module */}
                    <div className="w-full bg-[#111114] border border-[#222228] rounded-md p-6 flex flex-col items-center space-y-4">
                        <div className="flex items-center justify-between w-full border-b border-[#222228] pb-3 text-xs font-mono">
                            <span className="text-[#71717A] flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                    isAiSpeaking ? 'bg-[#10B981] animate-pulse' : isSending ? 'bg-[#F59E0B] animate-pulse' : 'bg-[#52525B]'
                                }`}></span>
                                ROHAN // AI LEAD INTERVIEWER
                            </span>
                            <span className="studio-badge bg-[#09090B] text-[#A1A1AA] border-[#222228]">
                                {isAiSpeaking ? 'TRANSMITTING AUDIO' : isSending ? 'EVALUATING REASONING' : isListening ? 'RECEIVING STREAM' : 'LISTENING'}
                            </span>
                        </div>

                        {/* Frequency Bar Visualizer */}
                        <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-md py-1">
                            {[16, 28, 22, 38, 26, 14, 32, 20, 42, 24, 30, 16, 36, 26, 20, 32, 18, 24].map((h, i) => (
                                <span
                                    key={i}
                                    style={{
                                        height: isAiSpeaking ? `${h}px` : isListening ? `${(h * 0.8)}px` : '4px',
                                    }}
                                    className={`w-1 rounded-sm transition-all duration-200 ${
                                        isAiSpeaking 
                                            ? 'bg-[#10B981]' 
                                            : isListening 
                                                ? 'bg-[#F43F5E]' 
                                                : isSending 
                                                    ? 'bg-[#F59E0B] animate-pulse' 
                                                    : 'bg-[#222228]'
                                    }`}
                                />
                            ))}
                        </div>

                        <span className="text-[11px] font-mono text-[#52525B]">
                            Acoustic Transceiver • 48kHz Voice Synthesis Active
                        </span>
                    </div>

                    {/* Question Card */}
                    <div className="w-full bg-[#111114] border border-[#222228] rounded-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FAFAFA]"></span> Current Interrogation
                            </span>
                            <button
                                onClick={() => speakAiMessage(latestAiMessage)}
                                className="studio-btn-secondary text-[11px] py-1"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Repeat Audio</span>
                            </button>
                        </div>
                        <p className="text-base sm:text-lg font-medium text-[#FAFAFA] leading-relaxed">
                            "{latestAiMessage || 'Initializing introductory questions...'}"
                        </p>
                    </div>

                    {/* Live Speech Recognition Transcript Box */}
                    {(candidateText || interimSpeech || isListening) && (
                        <div className="w-full bg-[#09090B] border border-[#222228] rounded-md p-4 space-y-1 font-mono text-xs">
                            <div className="flex justify-between text-[10px] text-[#71717A] uppercase">
                                <span>Candidate Spoken Buffer:</span>
                                {isListening && <span className="text-[#F43F5E]">RECORDING...</span>}
                            </div>
                            <p className="text-[#FAFAFA] leading-relaxed">
                                {candidateText} <span className="text-[#71717A] italic">{interimSpeech}</span>
                            </p>
                        </div>
                    )}

                    {/* Control Action Deck */}
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={toggleSpeechRecognition}
                                className={`px-5 py-2.5 rounded-md font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all flex-1 sm:flex-initial ${
                                    isListening
                                        ? 'bg-[#F43F5E] text-white animate-pulse'
                                        : 'studio-btn-primary'
                                }`}
                            >
                                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                <span>{isListening ? 'Halt Recording' : 'Press to Speak'}</span>
                            </button>

                            {(candidateText || interimSpeech) && (
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={isSending}
                                    className="studio-btn-secondary px-4 py-2.5 font-mono text-xs font-semibold"
                                >
                                    <span>Transmit</span>
                                    <Send className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                                id="jump-to-coding-btn"
                                onClick={() => handleSendMessage("I am ready for the coding challenge now! Let's start coding.")}
                                disabled={isSending}
                                className="studio-btn-secondary text-xs font-mono py-2.5"
                                title="Transition to Stage 2: Coding & DSA Workspace"
                            >
                                <Code2 className="w-3.5 h-3.5 text-[#10B981]" />
                                <span>Proceed to Coding Round</span>
                                <ArrowRight className="w-3 h-3" />
                            </button>

                            <button
                                onClick={() => setShowTextInput(!showTextInput)}
                                className="text-[11px] font-mono text-[#71717A] hover:text-[#FAFAFA] px-2 py-1"
                            >
                                {showTextInput ? '[Hide Text Input]' : '[Text Mode]'}
                            </button>
                        </div>
                    </div>

                    {/* Text Input Drawer */}
                    {showTextInput && (
                        <div className="w-full bg-[#111114] border border-[#222228] rounded-md p-3 flex gap-2">
                            <input
                                type="text"
                                value={candidateText}
                                onChange={(e) => setCandidateText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                placeholder="Type candidate explanation or answer..."
                                className="studio-input font-mono text-xs"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isSending || !candidateText.trim()}
                                className="studio-btn-primary px-4 font-mono text-xs"
                            >
                                Send
                            </button>
                        </div>
                    )}
                </main>
            ) : (
                /* ================= STAGE 2: PRECISION HACKERRANK CODING WORKSPACE ================= */
                <main className="flex-1 flex overflow-hidden bg-[#09090B] relative">
                    {/* LEFT PANEL: Problem Specification & Live Interviewer Guidance */}
                    <div
                        style={{ width: `${leftPanelWidth}%` }}
                        className="flex flex-col bg-[#111114] overflow-hidden flex-shrink-0"
                    >
                        {/* Tab Bar */}
                        <div className="h-10 border-b border-[#222228] bg-[#09090B] px-3 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-1 font-mono text-xs">
                                <button
                                    onClick={() => setLeftTab('problem')}
                                    className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                        leftTab === 'problem'
                                            ? 'bg-[#111114] text-[#FAFAFA] border-t border-x border-[#222228]'
                                            : 'text-[#71717A] hover:text-[#FAFAFA]'
                                    }`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Problem Specification</span>
                                </button>
                                <button
                                    onClick={() => setLeftTab('guidance')}
                                    className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                        leftTab === 'guidance'
                                            ? 'bg-[#111114] text-[#FAFAFA] border-t border-x border-[#222228]'
                                            : 'text-[#71717A] hover:text-[#FAFAFA]'
                                    }`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" />
                                    <span>Tech Lead (Rohan)</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                                </button>
                            </div>
                            <span className="font-mono text-[10px] text-[#52525B]">ACTIVE ROUND</span>
                        </div>

                        {/* Problem Tab Content */}
                        {leftTab === 'problem' && (
                            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[#A1A1AA] font-mono text-xs">
                                <div className="space-y-1.5 border-b border-[#222228] pb-4">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-semibold text-[#FAFAFA] font-sans">
                                            {codingChallenge?.title || 'Algorithmic Challenge'}
                                        </h2>
                                        <span className="studio-badge bg-[#18181C] text-[#F59E0B] border-[#F59E0B]/30">
                                            {codingChallenge?.difficulty || 'Medium'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#52525B]">
                                        Estimated Target: 20 minutes • Native isolated sandbox execution
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] uppercase text-[#71717A] tracking-wider block">
                                        Problem Description
                                    </span>
                                    <p className="text-[#FAFAFA] leading-relaxed whitespace-pre-line font-sans text-xs">
                                        {codingChallenge?.description || 'Write an efficient algorithm solving the specified technical requirements.'}
                                    </p>
                                </div>

                                {codingChallenge?.functionDescription && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase text-[#71717A] tracking-wider block">
                                            Function Signature
                                        </span>
                                        <pre className="p-3 bg-[#09090B] border border-[#222228] rounded text-xs text-[#FAFAFA] font-mono overflow-x-auto">
                                            {codingChallenge.functionDescription}
                                        </pre>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase text-[#71717A] block">Input Format</span>
                                        <div className="p-2.5 bg-[#09090B] border border-[#222228] rounded text-[11px] text-[#A1A1AA]">
                                            {codingChallenge?.inputFormat || 'Passed via standard function parameters.'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase text-[#71717A] block">Output Format</span>
                                        <div className="p-2.5 bg-[#09090B] border border-[#222228] rounded text-[11px] text-[#A1A1AA]">
                                            {codingChallenge?.outputFormat || 'Return the computed result matching return type.'}
                                        </div>
                                    </div>
                                </div>

                                {codingChallenge?.constraints && codingChallenge.constraints.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase text-[#71717A] tracking-wider block">
                                            Constraints
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {codingChallenge.constraints.map((c, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-[#09090B] border border-[#222228] text-[11px] text-[#A1A1AA]">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Interviewer Tab Content */}
                        {leftTab === 'guidance' && (
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between font-mono text-xs">
                                <div className="space-y-3 overflow-y-auto mb-4">
                                    <div className="p-2.5 bg-[#09090B] border border-[#222228] rounded flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                                            <span className="font-semibold text-[#FAFAFA]">Rohan (Tech Lead)</span>
                                        </div>
                                        <span className="text-[10px] text-[#52525B]">MONITORING SOLUTION</span>
                                    </div>

                                    {transcript.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded text-xs space-y-1 ${
                                                msg.role === 'ai'
                                                    ? 'bg-[#09090B] border border-[#222228] text-[#FAFAFA]'
                                                    : 'bg-[#18181C] border border-[#3F3F46] text-[#A1A1AA] ml-4'
                                            }`}
                                        >
                                            <span className="text-[10px] text-[#52525B] uppercase block">
                                                {msg.role === 'ai' ? 'ROHAN // TECH LEAD' : 'CANDIDATE // SOLUTION'}
                                            </span>
                                            <p className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-[#222228] pt-3 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={candidateText}
                                            onChange={(e) => setCandidateText(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                            placeholder="Ask Rohan a technical question or explain logic..."
                                            className="studio-input text-xs"
                                        />
                                        <button
                                            onClick={() => handleSendMessage()}
                                            disabled={isSending || !candidateText.trim()}
                                            className="studio-btn-primary px-3 text-xs"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Horizontal Hairline Resizer */}
                    <div
                        onMouseDown={() => setIsDraggingHorizontal(true)}
                        className={`w-1 ${
                            isDraggingHorizontal ? 'bg-[#FAFAFA]' : 'bg-[#222228]'
                        } hover:bg-[#3F3F46] cursor-col-resize transition-colors flex items-center justify-center flex-shrink-0 z-30 select-none`}
                        title="Resize problem description and editor"
                    />

                    {/* RIGHT PANEL: Monaco IDE & Native Compiler Sandbox */}
                    <div
                        ref={rightPanelRef}
                        style={{ width: `${100 - leftPanelWidth}%` }}
                        className="flex flex-col bg-[#09090B] overflow-hidden flex-1 min-w-0"
                    >
                        {/* Editor Top Bar (h-10) */}
                        <div className="h-10 border-b border-[#222228] bg-[#111114] px-3 flex items-center justify-between flex-shrink-0 font-mono text-xs">
                            <div className="flex items-center gap-2.5">
                                <span className="text-[11px] text-[#71717A] uppercase">Language:</span>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => {
                                        const newLang = e.target.value;
                                        setSelectedLanguage(newLang);
                                        if (!editorCode.trim() || editorCode.includes('// Starter template') || editorCode.includes('Write your')) {
                                            if (newLang === 'python') {
                                                setEditorCode("# Write your Python 3 solution below\ndef solution(data):\n    # TODO: Implement logic\n    return data\n\nif __name__ == '__main__':\n    import sys\n    inp = sys.stdin.read().strip()\n    print(solution(inp) or 'Execution completed')\n");
                                            } else if (newLang === 'cpp') {
                                                setEditorCode("// Write your C++ solution below\n#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    // TODO: Implement logic\n    cout << \"C++ Solution Output\" << endl;\n    return 0;\n}\n");
                                            } else if (newLang === 'java') {
                                                setEditorCode("// Write your Java solution below\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // TODO: Implement logic\n        System.out.println(\"Java Solution Output\");\n    }\n}\n");
                                            } else {
                                                setEditorCode(codingChallenge?.starterCode || "// Write your JavaScript solution below\nfunction solution(input) {\n    return input;\n}\n");
                                            }
                                        }
                                    }}
                                    className="bg-[#09090B] border border-[#222228] text-xs font-mono text-[#FAFAFA] px-2 py-1 rounded focus:outline-none focus:border-[#3F3F46]"
                                >
                                    <option value="javascript">JavaScript (Node.js 24)</option>
                                    <option value="python">Python 3 (3.14)</option>
                                    <option value="cpp">C++ (GCC 6.3 / C++17)</option>
                                    <option value="java">Java (OpenJDK 24)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditorCode(codingChallenge?.starterCode || '')}
                                    className="studio-btn-secondary text-[11px] py-1"
                                    title="Reset code to default challenge starter"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setLeftTab('guidance');
                                        handleSendMessage("I've finished writing and testing my solution. Rohan, please review it and walk through the implementation with me!");
                                    }}
                                    className="studio-btn-secondary text-[11px] py-1 text-[#10B981] hover:text-[#10B981]"
                                    title="Discuss solution with AI tech lead"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    <span>Discuss with Rohan</span>
                                </button>
                            </div>
                        </div>

                        {/* Monaco Editor Canvas */}
                        <div className="flex-1 min-h-0 bg-[#09090B] overflow-hidden">
                            <Editor
                                height="100%"
                                language={selectedLanguage}
                                theme="vs-dark"
                                value={editorCode}
                                onChange={(value) => setEditorCode(value || '')}
                                options={{
                                    fontSize: 13,
                                    fontFamily: '"JetBrains Mono", Consolas, monospace',
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 4,
                                    lineNumbers: 'on',
                                    renderLineHighlight: 'all',
                                    backgroundColor: '#09090B'
                                }}
                            />
                        </div>

                        {/* Vertical Hairline Resizer */}
                        <div
                            onMouseDown={() => setIsDraggingVertical(true)}
                            className={`h-1 ${
                                isDraggingVertical ? 'bg-[#FAFAFA]' : 'bg-[#222228]'
                            } hover:bg-[#3F3F46] cursor-row-resize transition-colors flex items-center justify-center flex-shrink-0 z-30 select-none`}
                            title="Resize console drawer"
                        />

                        {/* Bottom Execution Terminal Drawer */}
                        <div
                            style={{ height: `${consoleHeight}px` }}
                            className="bg-[#09090B] flex flex-col flex-shrink-0 border-t border-[#222228] overflow-hidden font-mono"
                        >
                            {/* Console Header Bar */}
                            <div className="h-9 border-b border-[#222228] bg-[#111114] px-3 flex items-center justify-between flex-shrink-0 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setConsoleTab('testcases')}
                                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                            consoleTab === 'testcases'
                                                ? 'bg-[#18181C] text-[#FAFAFA] border border-[#222228]'
                                                : 'text-[#71717A] hover:text-[#FAFAFA]'
                                        }`}
                                    >
                                        Test Cases
                                    </button>
                                    <button
                                        onClick={() => setConsoleTab('results')}
                                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                            consoleTab === 'results'
                                                ? 'bg-[#18181C] text-[#FAFAFA] border border-[#222228]'
                                                : 'text-[#71717A] hover:text-[#FAFAFA]'
                                        }`}
                                    >
                                        Execution Output
                                        {executionDetails.output && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${executionDetails.hasError ? 'bg-[#F43F5E]' : 'bg-[#10B981]'}`}></span>
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 text-xs">
                                    <label className="flex items-center gap-1.5 text-[11px] text-[#71717A] hover:text-[#FAFAFA] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useCustomInput}
                                            onChange={(e) => setUseCustomInput(e.target.checked)}
                                            className="rounded border-[#222228] bg-[#09090B] text-[#FAFAFA] focus:ring-0 w-3 h-3"
                                        />
                                        <span>Custom stdin</span>
                                    </label>
                                    <button
                                        onClick={() => setConsoleHeight(consoleHeight <= 90 ? 250 : 80)}
                                        className="text-[11px] text-[#71717A] hover:text-[#FAFAFA]"
                                    >
                                        {consoleHeight <= 90 ? '[Expand]' : '[Collapse]'}
                                    </button>
                                </div>
                            </div>

                            {/* Console Body Area */}
                            <div className="flex-1 min-h-0 p-3 overflow-y-auto text-xs text-[#FAFAFA] bg-[#09090B]">
                                {useCustomInput ? (
                                    <div className="h-full flex flex-col space-y-1">
                                        <span className="text-[10px] text-[#52525B] uppercase">Custom stdin input stream:</span>
                                        <textarea
                                            value={customInputText}
                                            onChange={(e) => setCustomInputText(e.target.value)}
                                            placeholder="Enter custom stdin test values..."
                                            className="flex-1 bg-[#111114] border border-[#222228] rounded p-2 text-xs font-mono text-[#FAFAFA] resize-none focus:outline-none"
                                        />
                                    </div>
                                ) : consoleTab === 'testcases' ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5">
                                            {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                                ? codingChallenge.sampleTestCases
                                                : [
                                                    { input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' },
                                                    { input: 'nums = [3, 2, 4], target = 6', expectedOutput: '[1, 2]' }
                                                ]
                                            ).map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveTestCase(idx)}
                                                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                                                        activeTestCase === idx
                                                            ? 'bg-[#18181C] text-[#FAFAFA] border border-[#3F3F46]'
                                                            : 'text-[#71717A] hover:text-[#FAFAFA]'
                                                    }`}
                                                >
                                                    Case {idx}
                                                </button>
                                            ))}
                                        </div>

                                        {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                            ? codingChallenge.sampleTestCases
                                            : [
                                                { input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' },
                                                { input: 'nums = [3, 2, 4], target = 6', expectedOutput: '[1, 2]' }
                                            ]
                                        )[activeTestCase] && (
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-[#52525B] uppercase block">Compiler Input</span>
                                                    <pre className="p-2 bg-[#111114] border border-[#222228] rounded text-[11px] text-[#FAFAFA] overflow-x-auto">
                                                        {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                                            ? codingChallenge.sampleTestCases
                                                            : [
                                                                { input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' }
                                                            ]
                                                        )[activeTestCase]?.input}
                                                    </pre>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-[#52525B] uppercase block">Expected Output</span>
                                                    <pre className="p-2 bg-[#111114] border border-[#222228] rounded text-[11px] text-[#10B981] overflow-x-auto">
                                                        {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                                            ? codingChallenge.sampleTestCases
                                                            : [
                                                                { expectedOutput: '[0, 1]' }
                                                            ]
                                                        )[activeTestCase]?.expectedOutput}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Execution Results */
                                    <div>
                                        {isRunningCode ? (
                                            <div className="flex items-center gap-2 text-[#71717A] py-3">
                                                <div className="w-3.5 h-3.5 border-2 border-[#FAFAFA] border-t-transparent rounded-full animate-spin"></div>
                                                <span>Compiling with native {selectedLanguage} runtime...</span>
                                            </div>
                                        ) : executionDetails.output ? (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className={`studio-badge ${
                                                        executionDetails.hasError
                                                            ? 'text-[#F43F5E] bg-[#F43F5E]/10 border-[#F43F5E]/30'
                                                            : 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30'
                                                    }`}>
                                                        {executionDetails.hasError ? 'ERROR // NON-ZERO EXIT' : 'OK // EXECUTION COMPLETED'}
                                                    </span>
                                                    <span className="text-[#52525B]">
                                                        Latency: {executionDetails.executionTime || '0.20s'}
                                                    </span>
                                                </div>
                                                <pre className="p-2.5 bg-[#111114] border border-[#222228] rounded text-xs whitespace-pre-wrap text-[#FAFAFA] overflow-x-auto">
                                                    {executionDetails.output}
                                                </pre>
                                            </div>
                                        ) : (
                                            <p className="text-[#52525B] py-3">
                                                Click "Run Code" below to compile against the test runner.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Live Interview Action Dock (h-12) */}
                            <div className="h-12 border-t border-[#222228] bg-[#111114] px-4 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRunCode}
                                        disabled={isRunningCode}
                                        className="studio-btn-primary text-xs font-mono"
                                        title="Run code with sample or custom test inputs"
                                    >
                                        <Play className="w-3 h-3 fill-current" />
                                        <span>{isRunningCode ? 'Compiling...' : 'Run Code'}</span>
                                    </button>
                                    <span className="text-[11px] text-[#52525B] font-mono hidden sm:inline">
                                        {isRunningCode ? 'Sub-second compilation active' : 'Native compiler ready'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-[#52525B] font-mono hidden md:inline">
                                        SUBMISSION WILL TRIGGER GEMINI 2.5 FLASH EVALUATION
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default InterviewRoom;
