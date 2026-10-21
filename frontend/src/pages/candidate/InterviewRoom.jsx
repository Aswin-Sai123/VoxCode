import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
    const location = useLocation();

    // Session state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [session, setSession] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [stage, setStage] = useState('CONCEPTUAL'); // 'CONCEPTUAL' | 'CODING' | 'COMPLETED'
    const [transcript, setTranscript] = useState([]);
    const [latestAiMessage, setLatestAiMessage] = useState('');
    const [currentTopic, setCurrentTopic] = useState('');
    const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
    const [totalTopics, setTotalTopics] = useState(3);
    const [latestEvaluation, setLatestEvaluation] = useState(null);

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
    const [micError, setMicError] = useState('');

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
                const state = location.state || {};
                const resumeText = state.resumeText || sessionStorage.getItem(`voxcode_resume_${code}`) || sessionStorage.getItem('voxcode_resume') || '';
                const interviewFormat = state.interviewFormat || sessionStorage.getItem(`voxcode_format_${code}`) || 'FULL_INTERVIEW';

                const res = await api.post(`/interview/start/${code}`, {
                    resumeText,
                    interviewFormat
                });
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

                    // Adaptive Curriculum State
                    if (data.session.topics && data.session.topics.length > 0) {
                        setTotalTopics(data.session.topics.length);
                        const currIdx = data.session.currentTopicIndex || 0;
                        setCurrentTopicIndex(currIdx);
                        setCurrentTopic(data.session.topics[currIdx] || data.session.topics[0]);
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

        // Auto-pause mic while AI speaks so the mic never catches the speakers
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

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

    // 4. Clean Turn-by-Turn Speech Recognition (No live streaming jitter)
    const toggleSpeechRecognition = () => {
        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                setIsListening(false);
            }
            return;
        }

        // If AI is currently speaking, do not open mic
        if (isAiSpeaking) {
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMicError('Speech recognition is not natively supported by this browser. Text input mode enabled.');
            setShowTextInput(true);
            return;
        }

        setMicError('');
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Clean turn-based utterance capture
        recognition.interimResults = false; // No streaming partial chunks
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setInterimSpeech('');
        };

        recognition.onresult = (event) => {
            // Barge-in: cut off AI audio immediately when candidate begins speaking
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsAiSpeaking(false);
                if (utteranceRef.current) utteranceRef.current = null;
            }
            let finalStr = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalStr += event.results[i][0].transcript + ' ';
                }
            }
            if (finalStr.trim()) {
                setCandidateText(prev => (prev ? prev + ' ' + finalStr.trim() : finalStr.trim()));
            }
        };

        recognition.onerror = (e) => {
            console.warn('Speech recognition error:', e.error);
            setIsListening(false);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                setMicError('Microphone permission was denied. Please allow microphone in browser or switch to text mode.');
                setShowTextInput(true);
            } else if (e.error === 'no-speech') {
                // Ignore benign timeout
            } else {
                setMicError(`Voice recognition notice: ${e.error}. Feel free to review/edit text below.`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimSpeech('');
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (err) {
            console.warn('Failed to start recognition:', err);
            setMicError('Microphone could not be started. Text mode enabled.');
            setShowTextInput(true);
        }
    };

    // 5. Send Candidate Answer to Backend + Gemini
    const handleSendMessage = async (customText) => {
        // Only submit finalized text or explicit customText (never send stray unreviewed interim fragments alone)
        const textToSend = (customText || candidateText || (isListening ? interimSpeech : '')).trim();
        if (!textToSend || isSending) return;

        if (recognitionRef.current && isListening) {
            try { recognitionRef.current.stop(); } catch {}
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
                const {
                    aiMessage,
                    stage: newStage,
                    codingChallenge: newChallenge,
                    transcript: updatedTranscript,
                    currentTopic: newTopic,
                    currentTopicIndex: newTopicIndex,
                    totalTopics: newTotalTopics,
                    answerEvaluation
                } = res.data.data;

                setLatestAiMessage(aiMessage);
                if (updatedTranscript) setTranscript(updatedTranscript);
                if (newTopic) setCurrentTopic(newTopic);
                if (newTopicIndex !== undefined) setCurrentTopicIndex(newTopicIndex);
                if (newTotalTopics !== undefined) setTotalTopics(newTotalTopics);
                if (answerEvaluation) setLatestEvaluation(answerEvaluation);

                if (newStage === 'CODING' && stage !== 'CODING') {
                    setTransitionBanner(true);
                    setStage('CODING');
                    if (newChallenge) {
                        setCodingChallenge(newChallenge);
                        setEditorCode(newChallenge.starterCode || '// Write your code here');
                        setSelectedLanguage(newChallenge.language || 'javascript');
                    }
                    setTimeout(() => setTransitionBanner(false), 5000);
                } else if (newStage === 'COMPLETED' && stage !== 'COMPLETED') {
                    setTimeout(() => {
                        setStage('COMPLETED');
                    }, 4000);
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
            <div className="h-screen bg-[#0A0A0B] flex flex-col items-center justify-center text-xs text-[#8B8B9E] space-y-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading interview session...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen bg-[#0A0A0B] flex items-center justify-center p-6">
                <div className="bg-[#141419] border border-red-500/20 rounded-xl p-8 max-w-sm w-full text-center space-y-4">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                    <div>
                        <p className="text-sm font-semibold text-[#EDEDF0]">Interview error</p>
                        <p className="text-xs text-[#8B8B9E] mt-1">{error}</p>
                    </div>
                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="studio-btn-secondary w-full py-2.5 text-xs font-medium"
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
            <div className="h-screen bg-[#0A0A0B] flex items-center justify-center p-6">
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>

                    {assessment?.assessmentType === 'MOCK' ? (
                        <>
                            <div className="space-y-1.5">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-block">
                                    Mock Interview Completed
                                </span>
                                <h2 className="text-xl font-semibold text-[#EDEDF0] tracking-tight">
                                    Practice Session Finished
                                </h2>
                                <p className="text-xs text-[#8B8B9E]">
                                    Your mock session for {assessment?.companyName} is complete. Your technical scorecard, rubric breakdown, Big-O complexity, and improvement vectors are ready.
                                </p>
                            </div>

                            <div className="bg-[#0A0A0B] border border-[#232330] rounded-lg p-4 text-left text-xs space-y-2.5">
                                <div className="flex justify-between">
                                    <span className="text-[#8B8B9E]">Role:</span>
                                    <span className="text-[#EDEDF0] font-medium">{assessment?.roleTitle || assessment?.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8B8B9E]">Target Company:</span>
                                    <span className="text-[#EDEDF0] font-medium">{assessment?.companyName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8B8B9E]">Exchanges:</span>
                                    <span className="text-[#EDEDF0] font-medium tabular-nums">{transcript.length} turns</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8B8B9E]">Language:</span>
                                    <span className="text-[#EDEDF0] font-medium capitalize">{selectedLanguage}</span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <button
                                    onClick={() => navigate(`/candidate/report/${session?._id}`)}
                                    className="btn-primary w-full py-2.5 text-xs font-medium"
                                >
                                    <span>View Assessment Report</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate('/candidate/dashboard')}
                                    className="studio-btn-secondary w-full py-2 text-xs font-medium"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                                    Assessment Submitted
                                </span>
                                <h2 className="text-xl font-semibold text-[#EDEDF0] tracking-tight">
                                    Submitted to {assessment?.companyName || 'Hiring Team'}
                                </h2>
                                <p className="text-xs text-[#8B8B9E]">
                                    Your interview transcript and code submission have been submitted directly to the {assessment?.companyName || 'company'} hiring team.
                                </p>
                            </div>

                            <div className="bg-[#0A0A0B] border border-[#232330] rounded-lg p-4 text-left text-xs space-y-2.5">
                                <div className="flex justify-between">
                                    <span className="text-[#8B8B9E]">Role:</span>
                                    <span className="text-[#EDEDF0] font-medium">{assessment?.roleTitle || assessment?.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8B8B9E]">Company:</span>
                                    <span className="text-[#EDEDF0] font-medium">{assessment?.companyName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8B8B9E]">Assessment Code:</span>
                                    <span className="text-[#EDEDF0] font-mono text-[11px]">{code}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8B8B9E]">Policy Notice:</span>
                                    <span className="text-amber-400/90 font-medium">Confidential to Recruiting Team</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                As per standard hiring procedures, assessment evaluation scores and grading rubrics are confidential to the recruiter. The recruiting team will contact you regarding next steps.
                            </p>

                            <div className="pt-2">
                                <button
                                    onClick={() => navigate('/candidate/dashboard')}
                                    className="btn-primary w-full py-2.5 text-xs font-medium"
                                >
                                    <span>Return to Dashboard</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}

                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-[#0A0A0B] text-[#EDEDF0] font-sans select-none">
            {/* Transition Alert Strip */}
            {transitionBanner && (
                <div className="h-9 bg-amber-500/10 border-b border-amber-500/30 px-4 flex items-center justify-between text-xs text-amber-400">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>Coding challenge started — editor workspace is now unlocked.</span>
                    </span>
                    <span className="text-xs text-[#8B8B9E]">Phase 2: Coding</span>
                </div>
            )}

            {/* Top Bar (h-14) */}
            <header className="h-14 border-b border-[#232330] bg-[#0A0A0B]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-40">
                {/* Left: Identity & Role */}
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-[#EDEDF0]">
                        VoxCode
                    </span>
                    <span className="text-[#363645] text-xs">/</span>
                    <span className="text-xs text-[#8B8B9E] truncate max-w-[180px] sm:max-w-xs">
                        {assessment?.title || assessment?.roleTitle}
                    </span>
                </div>

                {/* Center: Phase Badge */}
                <div className="flex items-center gap-2">
                    {code === 'PRACTICE-MOCK-SESSION' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Practice Lab (Ungraded)
                        </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        stage === 'CONCEPTUAL'
                            ? 'bg-[#141419] text-[#EDEDF0] border-[#363645]'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                        {stage === 'CONCEPTUAL' ? 'Phase 1: Discussion' : 'Phase 2: Live Coding'}
                    </span>
                </div>

                {/* Right: Timer, Audio Controls & Submit */}
                <div className="flex items-center gap-3">
                    {/* Countdown Timer */}
                    <div className={`px-3 py-1.5 rounded-lg bg-[#141419] border text-xs font-mono font-medium tabular-nums flex items-center gap-2 ${
                        timeLeftSeconds < 300
                            ? 'border-amber-500/40 text-amber-400'
                            : 'border-[#232330] text-[#EDEDF0]'
                    }`}>
                        <Clock className="w-3.5 h-3.5 text-[#8B8B9E]" />
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
                        className="studio-btn-secondary p-2"
                        title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
                    >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#8B8B9E]" />}
                    </button>

                    {/* End & Submit Button */}
                    <button
                        id="submit-interview-btn"
                        onClick={() => handleSubmitInterview()}
                        disabled={isSubmitting}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            confirmSubmit 
                                ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm' 
                                : 'studio-btn-secondary hover:border-red-500/30 hover:text-red-400'
                        }`}
                        title="Submit interview assessment for evaluation"
                    >
                        {isSubmitting ? 'Submitting...' : confirmSubmit ? 'Confirm submit?' : 'End session'}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            {stage === 'CONCEPTUAL' ? (
                /* ================= STAGE 1: VOICE DISCUSSION STUDIO ================= */
                <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full space-y-6">
                    {/* Visualizer Module */}
                    <div className="w-full bg-[#141419] border border-[#232330] rounded-xl p-6 flex flex-col items-center space-y-4">
                        <div className="flex items-center justify-between w-full border-b border-[#232330] pb-3 text-xs">
                            <span className="text-[#8B8B9E] flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                    isAiSpeaking ? 'bg-emerald-400 animate-pulse' : isSending ? 'bg-amber-400 animate-pulse' : 'bg-[#555568]'
                                }`}></span>
                                <span className="font-medium text-[#EDEDF0]">Rohan</span>
                                <span className="text-[#555568]">• Lead Interviewer</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#0A0A0B] text-[#8B8B9E] border border-[#232330]">
                                {isAiSpeaking ? 'Speaking' : isSending ? 'Thinking...' : isListening ? 'Listening' : 'Ready'}
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
                                    className={`w-1 rounded-full transition-all duration-200 ${
                                        isAiSpeaking 
                                            ? 'bg-emerald-400' 
                                            : isListening 
                                                ? 'bg-red-400' 
                                                : isSending 
                                                    ? 'bg-amber-400 animate-pulse' 
                                                    : 'bg-[#232330]'
                                    }`}
                                />
                            ))}
                        </div>

                        <span className="text-xs text-[#555568]">
                            Interactive voice response active
                        </span>
                    </div>

                    {/* Question Card */}
                    <div className="w-full bg-[#141419] border border-[#232330] rounded-xl p-6 sm:p-7 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[#8B8B9E] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Technical Discussion
                                </span>
                                {currentTopic && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-xs">
                                        Topic {currentTopicIndex + 1}/{totalTopics}: {currentTopic}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => speakAiMessage(latestAiMessage)}
                                className="studio-btn-secondary text-xs py-1 px-2.5"
                            >
                                <RotateCcw className="w-3 h-3 text-[#8B8B9E]" />
                                <span>Repeat question</span>
                            </button>
                        </div>
                        <p className="text-base sm:text-lg font-medium text-[#EDEDF0] leading-relaxed">
                            "{latestAiMessage || 'Initializing interview questions...'}"
                        </p>
                        {latestEvaluation && (
                            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#232330] text-xs font-mono">
                                <span className="text-[#8B8B9E] text-[11px]">Previous Answer:</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${latestEvaluation.correctness >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                    Correctness: {latestEvaluation.correctness}%
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${latestEvaluation.depth >= 70 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-[#1C1C24] text-[#8B8B9E] border border-[#232330]'}`}>
                                    Depth: {latestEvaluation.depth}%
                                </span>
                                {latestEvaluation.critique && (
                                    <span className="text-[#8B8B9E] text-[11px] italic truncate max-w-sm sm:max-w-md">
                                        "{latestEvaluation.critique}"
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mic Error Banner */}
                    {micError && (
                        <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center justify-between font-mono gap-2">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{micError}</span>
                            </div>
                            <button
                                onClick={() => { setShowTextInput(true); setMicError(''); }}
                                className="studio-btn-secondary text-[11px] py-0.5 px-2 text-[#EDEDF0]"
                            >
                                Switch to Text Mode
                            </button>
                        </div>
                    )}

                    {/* Speech Recognition Transcript Box with Review & Edit */}
                    {(candidateText || interimSpeech || isListening) && (
                        <div className="w-full bg-[#141419] border border-[#232330] rounded-xl p-4 space-y-2 text-xs">
                            <div className="flex justify-between items-center text-xs text-[#8B8B9E]">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    Candidate Speech Buffer:
                                </span>
                                {isListening ? (
                                    <span className="text-red-400 font-medium animate-pulse">● RECORDING AUDIO...</span>
                                ) : (
                                    <span className="text-emerald-400 text-[11px]">[REVIEW & EDIT BEFORE TRANSMITTING]</span>
                                )}
                            </div>
                            <textarea
                                value={candidateText}
                                onChange={(e) => setCandidateText(e.target.value)}
                                placeholder={isListening ? "Transcribing speech from microphone..." : "Transcribed response. You can refine or edit your answer before sending..."}
                                rows={3}
                                className="w-full bg-[#0A0A0B] border border-[#232330] rounded-lg p-2.5 text-xs text-[#EDEDF0] focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed"
                            />
                            {interimSpeech && (
                                <p className="text-[11px] text-[#8B8B9E] italic">
                                    Live stream: {interimSpeech}
                                </p>
                            )}
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setCandidateText(''); setInterimSpeech(''); }}
                                    className="studio-btn-secondary text-xs py-1 px-2.5"
                                >
                                    Clear Buffer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSendMessage()}
                                    disabled={isSending || (!candidateText.trim() && !interimSpeech.trim())}
                                    className="btn-primary text-xs py-1 px-3.5 font-medium"
                                >
                                    {isSending ? 'Transmitting...' : 'Transmit Answer'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Control Action Deck */}
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={toggleSpeechRecognition}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all flex-1 sm:flex-initial ${
                                    isListening
                                        ? 'bg-red-600 text-white animate-pulse'
                                        : 'btn-primary'
                                }`}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                <span>{isListening ? 'Stop speaking' : 'Click to speak'}</span>
                            </button>

                            {(candidateText || interimSpeech) && (
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={isSending}
                                    className="studio-btn-secondary px-4 py-2.5 text-xs font-medium"
                                >
                                    <span>Send answer</span>
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <button
                                onClick={() => setShowTextInput(!showTextInput)}
                                className="text-xs text-[#8B8B9E] hover:text-[#EDEDF0] px-2 py-1"
                            >
                                {showTextInput ? 'Hide text input' : 'Type instead'}
                            </button>
                        </div>
                    </div>

                    {/* Text Input Drawer */}
                    {showTextInput && (
                        <div className="w-full bg-[#141419] border border-[#232330] rounded-xl p-3 flex gap-2">
                            <input
                                type="text"
                                value={candidateText}
                                onChange={(e) => setCandidateText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                placeholder="Type your answer here..."
                                className="studio-input text-sm"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isSending || !candidateText.trim()}
                                className="btn-primary px-5 text-xs font-medium"
                            >
                                Send
                            </button>
                        </div>
                    )}
                </main>
            ) : (
                /* ================= STAGE 2: CODING WORKSPACE ================= */
                <main className="flex-1 flex overflow-hidden bg-[#09090B] relative">
                    {/* LEFT PANEL: Problem Specification & Live Interviewer Guidance */}
                    <div
                        style={{ width: `${leftPanelWidth}%` }}
                        className="flex flex-col bg-[#111114] overflow-hidden flex-shrink-0"
                    >
                        {/* Tab Bar */}
                        <div className="h-10 border-b border-[#232330] bg-[#0A0A0B] px-3 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-1 text-xs">
                                <button
                                    onClick={() => setLeftTab('problem')}
                                    className={`px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                        leftTab === 'problem'
                                            ? 'bg-[#141419] text-[#EDEDF0] border-t border-x border-[#232330]'
                                            : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                                    }`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Problem</span>
                                </button>
                                <button
                                    onClick={() => setLeftTab('guidance')}
                                    className={`px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                        leftTab === 'guidance'
                                            ? 'bg-[#141419] text-[#EDEDF0] border-t border-x border-[#232330]'
                                            : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                                    }`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Discussion</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                </button>
                            </div>
                        </div>

                        {/* Problem Tab Content */}
                        {leftTab === 'problem' && (
                            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[#8B8B9E] text-xs">
                                <div className="space-y-1.5 border-b border-[#232330] pb-4">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-semibold text-[#EDEDF0]">
                                            {codingChallenge?.title || 'Algorithmic Challenge'}
                                        </h2>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            {codingChallenge?.difficulty || 'Medium'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#555568]">
                                        Estimated time: 20 minutes • Isolated sandbox execution
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-[#EDEDF0] block">
                                        Problem Description
                                    </span>
                                    <p className="text-[#EDEDF0] leading-relaxed whitespace-pre-line text-xs">
                                        {codingChallenge?.description || 'Write an efficient algorithm solving the specified technical requirements.'}
                                    </p>
                                </div>

                                {codingChallenge?.functionDescription && (
                                    <div className="space-y-1.5">
                                        <span className="text-xs font-medium text-[#EDEDF0] block">
                                            Function Signature
                                        </span>
                                        <pre className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs text-[#EDEDF0] font-mono overflow-x-auto">
                                            {codingChallenge.functionDescription}
                                        </pre>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-[#8B8B9E] block">Input Format</span>
                                        <div className="p-2.5 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs text-[#8B8B9E]">
                                            {codingChallenge?.inputFormat || 'Passed via standard function parameters.'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-[#8B8B9E] block">Output Format</span>
                                        <div className="p-2.5 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs text-[#8B8B9E]">
                                            {codingChallenge?.outputFormat || 'Return the computed result matching return type.'}
                                        </div>
                                    </div>
                                </div>

                                {codingChallenge?.constraints && codingChallenge.constraints.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-xs font-medium text-[#EDEDF0] block">
                                            Constraints
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {codingChallenge.constraints.map((c, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded-md bg-[#0A0A0B] border border-[#232330] text-xs text-[#8B8B9E]">
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
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between text-xs">
                                <div className="space-y-3 overflow-y-auto mb-4">
                                    <div className="p-2.5 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                            <span className="font-medium text-[#EDEDF0]">Rohan (Tech Lead)</span>
                                        </div>
                                        <span className="text-xs text-[#555568]">Online</span>
                                    </div>

                                    {transcript.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded-lg text-xs space-y-1 ${
                                                msg.role === 'ai'
                                                    ? 'bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0]'
                                                    : 'bg-[#1C1C24] border border-[#363645] text-[#EDEDF0] ml-4'
                                            }`}
                                        >
                                            <span className="text-[11px] font-medium text-[#8B8B9E] block">
                                                {msg.role === 'ai' ? 'Rohan' : 'You'}
                                            </span>
                                            <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-[#232330] pt-3 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={candidateText}
                                            onChange={(e) => setCandidateText(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                            placeholder="Ask a question or explain your approach..."
                                            className="studio-input text-xs"
                                        />
                                        <button
                                            onClick={() => handleSendMessage()}
                                            disabled={isSending || !candidateText.trim()}
                                            className="btn-primary px-3 text-xs"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Horizontal Resizer */}
                    <div
                        onMouseDown={() => setIsDraggingHorizontal(true)}
                        className={`w-1 ${
                            isDraggingHorizontal ? 'bg-blue-500' : 'bg-[#232330]'
                        } hover:bg-blue-500 cursor-col-resize transition-colors flex items-center justify-center flex-shrink-0 z-30 select-none`}
                        title="Resize problem description and editor"
                    />

                    {/* RIGHT PANEL: Monaco IDE & Native Compiler Sandbox */}
                    <div
                        ref={rightPanelRef}
                        style={{ width: `${100 - leftPanelWidth}%` }}
                        className="flex flex-col bg-[#0A0A0B] overflow-hidden flex-1 min-w-0"
                    >
                        {/* Editor Top Bar (h-10) */}
                        <div className="h-10 border-b border-[#232330] bg-[#141419] px-3 flex items-center justify-between flex-shrink-0 text-xs">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs text-[#8B8B9E]">Language:</span>
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
                                    className="bg-[#0A0A0B] border border-[#232330] text-xs text-[#EDEDF0] px-2.5 py-1 rounded-md focus:outline-none focus:border-blue-500"
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
                                    className="studio-btn-secondary text-xs py-1 px-2.5"
                                    title="Reset code to default starter template"
                                >
                                    <RotateCcw className="w-3 h-3 text-[#8B8B9E]" />
                                    <span>Reset</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setLeftTab('guidance');
                                        handleSendMessage("I've finished writing and testing my solution. Rohan, please review it and walk through the implementation with me!");
                                    }}
                                    className="studio-btn-secondary text-xs py-1 px-2.5 text-blue-400 hover:text-blue-300"
                                    title="Discuss solution with AI interviewer"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    <span>Discuss solution</span>
                                </button>
                            </div>
                        </div>

                        {/* Monaco Editor Canvas */}
                        <div className="flex-1 min-h-0 bg-[#0A0A0B] overflow-hidden">
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
                                    backgroundColor: '#0A0A0B'
                                }}
                            />
                        </div>

                        {/* Vertical Resizer */}
                        <div
                            onMouseDown={() => setIsDraggingVertical(true)}
                            className={`h-1 ${
                                isDraggingVertical ? 'bg-blue-500' : 'bg-[#232330]'
                            } hover:bg-blue-500 cursor-row-resize transition-colors flex items-center justify-center flex-shrink-0 z-30 select-none`}
                            title="Resize console drawer"
                        />

                        {/* Bottom Execution Terminal Drawer */}
                        <div
                            style={{ height: `${consoleHeight}px` }}
                            className="bg-[#0A0A0B] flex flex-col flex-shrink-0 border-t border-[#232330] overflow-hidden"
                        >
                            {/* Console Header Bar */}
                            <div className="h-9 border-b border-[#232330] bg-[#141419] px-3 flex items-center justify-between flex-shrink-0 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setConsoleTab('testcases')}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                            consoleTab === 'testcases'
                                                ? 'bg-[#1C1C24] text-[#EDEDF0] border border-[#232330]'
                                                : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                                        }`}
                                    >
                                        Test Cases
                                    </button>
                                    <button
                                        onClick={() => setConsoleTab('results')}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                            consoleTab === 'results'
                                                ? 'bg-[#1C1C24] text-[#EDEDF0] border border-[#232330]'
                                                : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                                        }`}
                                    >
                                        Execution Output
                                        {executionDetails.output && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${executionDetails.hasError ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 text-xs">
                                    <label className="flex items-center gap-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useCustomInput}
                                            onChange={(e) => setUseCustomInput(e.target.checked)}
                                            className="rounded border-[#232330] bg-[#0A0A0B] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                                        />
                                        <span>Custom input</span>
                                    </label>
                                    <button
                                        onClick={() => setConsoleHeight(consoleHeight <= 90 ? 250 : 80)}
                                        className="text-xs text-[#8B8B9E] hover:text-[#EDEDF0]"
                                    >
                                        {consoleHeight <= 90 ? 'Expand' : 'Collapse'}
                                    </button>
                                </div>
                            </div>

                            {/* Console Body Area */}
                            <div className="flex-1 min-h-0 p-3 overflow-y-auto text-xs text-[#EDEDF0] bg-[#0A0A0B]">
                                {useCustomInput ? (
                                    <div className="h-full flex flex-col space-y-1">
                                        <span className="text-xs text-[#8B8B9E]">Custom stdin input:</span>
                                        <textarea
                                            value={customInputText}
                                            onChange={(e) => setCustomInputText(e.target.value)}
                                            placeholder="Enter input values..."
                                            className="flex-1 bg-[#141419] border border-[#232330] rounded-lg p-2.5 text-xs font-mono text-[#EDEDF0] resize-none focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                ) : consoleTab === 'testcases' ? (
                                    <div className="space-y-2.5">
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
                                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                                        activeTestCase === idx
                                                            ? 'bg-[#1C1C24] text-[#EDEDF0] border border-[#363645]'
                                                            : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                                                    }`}
                                                >
                                                    Case {idx + 1}
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
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-[#8B8B9E] block">Input</span>
                                                    <pre className="p-2.5 bg-[#141419] border border-[#232330] rounded-lg text-xs text-[#EDEDF0] font-mono overflow-x-auto">
                                                        {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                                            ? codingChallenge.sampleTestCases
                                                            : [
                                                                { input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' }
                                                            ]
                                                        )[activeTestCase]?.input}
                                                    </pre>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-[#8B8B9E] block">Expected Output</span>
                                                    <pre className="p-2.5 bg-[#141419] border border-[#232330] rounded-lg text-xs text-emerald-400 font-mono overflow-x-auto">
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
                                            <div className="flex items-center gap-2 text-[#8B8B9E] py-3 text-xs">
                                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span>Compiling and running tests...</span>
                                            </div>
                                        ) : executionDetails.output ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                        executionDetails.hasError
                                                            ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                    }`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        <span>{executionDetails.hasError ? 'Execution error' : 'Output verified'}</span>
                                                    </span>
                                                    <span className="text-xs text-[#555568]">
                                                        Time: {executionDetails.executionTime || '0.20s'}
                                                    </span>
                                                </div>
                                                <pre className="p-3 bg-[#141419] border border-[#232330] rounded-lg text-xs font-mono whitespace-pre-wrap text-[#EDEDF0] overflow-x-auto">
                                                    {executionDetails.output}
                                                </pre>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-[#555568] py-3">
                                                Click "Run Code" below to execute against test cases.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Live Interview Action Dock (h-12) */}
                            <div className="h-12 border-t border-[#232330] bg-[#141419] px-4 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleRunCode}
                                        disabled={isRunningCode}
                                        className="btn-primary text-xs py-1.5 px-3.5"
                                        title="Run code with test inputs"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>{isRunningCode ? 'Running...' : 'Run Code'}</span>
                                    </button>
                                    <span className="text-xs text-[#8B8B9E] hidden sm:inline">
                                        {isRunningCode ? 'Executing...' : 'Runner ready'}
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
