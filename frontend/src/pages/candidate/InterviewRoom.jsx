import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../../services/api';

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
    const [transitionBanner, setTransitionBanner] = useState(false);

    // HackerRank IDE Tabs & Console state
    const [leftTab, setLeftTab] = useState('problem'); // 'problem' | 'guidance' | 'submissions'
    const [consoleTab, setConsoleTab] = useState('testcases'); // 'testcases' | 'results'
    const [activeTestCase, setActiveTestCase] = useState(0);
    const [useCustomInput, setUseCustomInput] = useState(false);
    const [customInputText, setCustomInputText] = useState('');
    const [executionDetails, setExecutionDetails] = useState({ hasError: false, executionTime: '', output: '' });
    const [copySuccessIndex, setCopySuccessIndex] = useState(null);

    // Resizable split panels & console sliders
    const [leftPanelWidth, setLeftPanelWidth] = useState(45); // percentage: 45% left / 55% right
    const [consoleHeight, setConsoleHeight] = useState(250); // pixels: 250px console height
    const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
    const [isDraggingVertical, setIsDraggingVertical] = useState(false);
    const rightPanelRef = useRef(null);

    // Refs
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);
    const isMutedRef = useRef(false); // ref so speakAiMessage always reads the latest mute state
    const utteranceRef = useRef(null); // prevent Chrome GC from cutting off voice mid-speech

    // Split-panel and console drag listener
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingHorizontal) {
                const newWidthPct = (e.clientX / window.innerWidth) * 100;
                if (newWidthPct >= 20 && newWidthPct <= 80) {
                    setLeftPanelWidth(newWidthPct);
                }
            } else if (isDraggingVertical && rightPanelRef.current) {
                const rect = rightPanelRef.current.getBoundingClientRect();
                const newHeight = rect.bottom - e.clientY;
                const maxHeight = Math.max(200, window.innerHeight - 150);
                if (newHeight >= 94 && newHeight <= Math.min(650, maxHeight)) {
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

    // 2. Countdown Timer — only start once the session (and its duration) is loaded
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

    // Preload available browser voices for natural TTS
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }, []);

    // 3. Web Speech API — Text to Speech (Natural, smooth, non-choppy voice)
    const speakAiMessage = (text) => {
        if (isMutedRef.current || !('speechSynthesis' in window) || !text) return;

        window.speechSynthesis.cancel(); // cancel any ongoing utterance

        // 1. Clean text of markdown, code blocks, bullet points, and technical symbols that cause speech synth stutters
        const cleanText = text
            .replace(/```[\s\S]*?```/g, ' ') // remove code blocks
            .replace(/`([^`]+)`/g, '$1') // unquote inline code
            .replace(/Node\.js/gi, 'Node JS')
            .replace(/\be\.g\./gi, 'for example')
            .replace(/\bi\.e\./gi, 'that is')
            .replace(/O\(([^)]+)\)/gi, 'O of $1')
            .replace(/[*#_~[\](){}<>|]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // 2. Select voice: prioritize Neural / Online Natural voices for human warmth
        const voices = window.speechSynthesis.getVoices();

        // 1. High-definition Indian English Natural/Online voice (e.g. Microsoft Neerja / Prabhat Natural)
        const indianNaturalVoice = voices.find(v => (v.lang === 'en-IN' || v.lang.startsWith('en_IN') || v.name.toLowerCase().includes('india')) && (v.name.includes('Natural') || v.name.includes('Online')) && !v.name.toLowerCase().includes('hindi'));
        // 2. Local Indian voice (e.g. Microsoft Ravi, Heera on Windows)
        const indianLocalVoice = voices.find(v => (v.lang === 'en-IN' || v.lang.startsWith('en_IN') || v.name.toLowerCase().includes('india')) && v.localService && !v.name.toLowerCase().includes('hindi'));
        // 3. Any Indian voice
        const indianVoice = voices.find(v => (v.lang === 'en-IN' || v.lang.startsWith('en_IN') || v.name.toLowerCase().includes('india')) && !v.name.toLowerCase().includes('hindi'));
        // 4. High-definition Natural / Online English voice (e.g. Microsoft Christopher / Guy Online Natural, Google Natural)
        const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online')));
        // 5. Local English voice (zero network buffering, e.g. Microsoft Mark, David, Zira)
        const localVoice = voices.find(v => v.lang.startsWith('en') && v.localService);
        // 6. Fallback voice
        const fallbackVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha')));

        const selectedVoice = indianNaturalVoice || indianLocalVoice || indianVoice || naturalVoice || localVoice || fallbackVoice;
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => {
            setIsAiSpeaking(false);
            utteranceRef.current = null;
        };
        utterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.warn('SpeechSynthesis error:', e.error);
            }
            setIsAiSpeaking(false);
            utteranceRef.current = null;
        };

        // Retain ref so Chrome's garbage collector never kills speech mid-sentence
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    // 4. Web Speech API — Speech Recognition with Instant Barge-In (Microphone)
    const toggleSpeechRecognition = () => {
        // BARGE-IN: Stop AI speaking immediately when candidate engages mic
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
        if (utteranceRef.current) utteranceRef.current = null;

        if (isListening) {
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech Recognition is not supported in this browser. Please use Google Chrome or type your answer.');
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
            // BARGE-IN: If Rohan is speaking and candidate speaks into mic, cut off Rohan instantly!
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

        // Stop mic and speech
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsAiSpeaking(false);

        setIsSending(true);
        setCandidateText('');
        setInterimSpeech('');

        // Optimistically update transcript
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

                // Handle transition from CONCEPTUAL to CODING
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

    // 6. Run Code (HackerRank Test Suite Runner)
    const handleRunCode = async () => {
        setIsRunningCode(true);
        setConsoleTab('results');
        setExecutionOutput('Compiling and executing code against test cases...');
        try {
            const res = await api.post('/interview/run-code', {
                language: selectedLanguage,
                code: editorCode,
                customInput: useCustomInput ? customInputText : undefined
            });
            if (res.data.success) {
                const out = res.data.data.output || 'Code executed with no output.';
                setExecutionOutput(out);
                setExecutionDetails({
                    hasError: res.data.data.hasError || false,
                    executionTime: res.data.data.executionTime || '0.04s',
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

    // 7. Submit Assessment
    const handleSubmitInterview = async () => {
        if (!window.confirm('Are you ready to submit your interview assessment?')) return;
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

    // Format timer
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-primary-500 mb-4"></div>
                <p className="text-gray-400 font-medium">Entering AI Interview Room...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
                <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md text-center text-white">
                    <p className="text-red-400 font-bold text-lg mb-2">Interview Room Error</p>
                    <p className="text-gray-400 text-sm mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-sm"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // 8. STAGE 3 — Completed Screen
    if (stage === 'COMPLETED') {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12 text-white">
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 max-w-xl text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold mb-2">Interview Completed!</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Your dialogue exchanges and practical code submission have been evaluated by Rohan (AI Interviewer). Your comprehensive score breakdown and analysis are ready!
                    </p>

                    <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 mb-8 text-left space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Role:</span>
                            <span className="font-semibold text-gray-200">{assessment?.roleTitle || assessment?.role?.title}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Company:</span>
                            <span className="font-semibold text-gray-200">{assessment?.companyName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Dialogue Exchanges:</span>
                            <span className="font-semibold text-primary-400">{transcript.length} messages</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Code Submitted:</span>
                            <span className="font-semibold text-green-400">{selectedLanguage.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate(`/candidate/report/${session?._id}`)}
                            className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 font-bold rounded-xl transition-all shadow-lg shadow-primary-600/30 text-white flex items-center justify-center gap-2 text-sm"
                        >
                            <span>📊</span>
                            <span>View Full Performance Report Card</span>
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => navigate('/candidate/reports')}
                                className="py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-colors border border-gray-700"
                            >
                                All My Reports
                            </button>
                            <button
                                onClick={() => navigate('/candidate/dashboard')}
                                className="py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-colors border border-gray-700"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-gray-950 text-white flex flex-col font-sans ${stage === 'CODING' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
            {/* Transition Alert Banner */}
            {transitionBanner && (
                <div className="bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-3 text-center text-sm font-bold flex items-center justify-center gap-2 animate-bounce">
                    <span>⚡ Transitioning to Practical Coding Round — Opening Workspace!</span>
                </div>
            )}

            {/* Top Navigation Bar */}
            <header className="h-16 border-b border-gray-800 bg-gray-900/80 backdrop-blur px-6 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-lg font-black tracking-tight bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        VoxCode
                    </span>
                    <span className="text-gray-600">|</span>
                    <div>
                        <p className="text-sm font-bold text-gray-200">{assessment?.title || 'Technical Interview'}</p>
                        <p className="text-xs text-gray-400">{assessment?.roleTitle} • {assessment?.companyName}</p>
                    </div>
                </div>

                {/* Center Timer & Stage Pill */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-800/80 border border-gray-700/60 px-4 py-1.5 rounded-full">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="font-mono font-bold text-sm tracking-wider text-gray-200">
                            {formatTime(timeLeftSeconds)}
                        </span>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        stage === 'CONCEPTUAL'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    }`}>
                        {stage === 'CONCEPTUAL' ? 'Round 1: Conceptual Q&A' : 'Round 2: Coding & DSA'}
                    </span>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const newMuted = !isMuted;
                            isMutedRef.current = newMuted; // keep ref in sync
                            if (newMuted && window.speechSynthesis) window.speechSynthesis.cancel();
                            setIsMuted(newMuted);
                        }}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isMuted ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                        title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
                    >
                        {isMuted ? '🔇 Voice Muted' : '🔊 Voice On'}
                    </button>
                    <button
                        onClick={handleSubmitInterview}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Submitting...' : 'End & Submit'}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            {stage === 'CONCEPTUAL' ? (
                /* ================= STAGE 1: IMMERSIVE Q&A ROOM (NO CODE EDITOR) ================= */
                <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full">
                    {/* Glowing AI Avatar Hub */}
                    <div className="relative mb-8 flex flex-col items-center">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                            isAiSpeaking
                                ? 'bg-gradient-to-tr from-primary-500 to-purple-600 ring-8 ring-primary-500/30 shadow-2xl shadow-primary-500/50 scale-105'
                                : 'bg-gray-900 border-2 border-gray-800 shadow-xl'
                        }`}>
                            <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>

                        {/* Animated voice activity waves */}
                        <div className="flex items-center gap-1.5 mt-4 h-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <span
                                    key={i}
                                    className={`w-1 rounded-full transition-all duration-200 ${
                                        isAiSpeaking ? 'bg-primary-400 animate-pulse' : 'bg-gray-700 h-2'
                                    }`}
                                    style={{ height: isAiSpeaking ? `${12 + (i % 3) * 10}px` : '6px' }}
                                />
                            ))}
                            <span className="text-xs text-gray-400 ml-2 font-medium">
                                {isAiSpeaking ? 'Interviewer is speaking...' : isSending ? 'Interviewer is thinking...' : 'Listening to you'}
                            </span>
                        </div>
                    </div>

                    {/* AI Question Subtitle Card */}
                    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl backdrop-blur">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary-400"></span> Current Question
                            </span>
                            <button
                                onClick={() => speakAiMessage(latestAiMessage)}
                                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                            >
                                ↺ Repeat Question
                            </button>
                        </div>
                        <p className="text-xl sm:text-2xl font-semibold text-gray-100 leading-relaxed">
                            "{latestAiMessage || 'Preparing your opening question...'}"
                        </p>
                    </div>

                    {/* Candidate Live Transcription Display */}
                    {(candidateText || interimSpeech || isListening) && (
                        <div className="w-full bg-primary-950/30 border border-primary-500/20 rounded-2xl p-5 mb-6 text-left">
                            <p className="text-xs font-bold text-primary-400 uppercase tracking-wider mb-1">Your Spoken Answer</p>
                            <p className="text-base text-gray-200">
                                {candidateText} <span className="text-primary-400 italic">{interimSpeech}</span>
                            </p>
                        </div>
                    )}

                    {/* Speech / Action Dock */}
                    <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                        {/* Mic Button */}
                        <button
                            onClick={toggleSpeechRecognition}
                            className={`px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-3 transition-all shadow-xl ${
                                isListening
                                    ? 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-500/30 animate-pulse'
                                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-600/30 hover:scale-105'
                            }`}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            {isListening ? 'Listening (Click to Finish)' : 'Press to Speak'}
                        </button>

                        {/* Submit Spoken Answer */}
                        {(candidateText || interimSpeech) && (
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isSending}
                                className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                            >
                                {isSending ? 'Sending...' : 'Send Answer →'}
                            </button>
                        )}

                        <button
                            onClick={() => setShowTextInput(!showTextInput)}
                            className="text-xs text-gray-400 hover:text-gray-200 underline font-medium py-2 px-3"
                        >
                            {showTextInput ? 'Hide text chat' : 'Prefer typing? Open text input'}
                        </button>
                    </div>

                    {/* Optional Text Input Modal/Drawer */}
                    {showTextInput && (
                        <div className="w-full mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-4 flex gap-3">
                            <input
                                type="text"
                                value={candidateText}
                                onChange={(e) => {
                                    if (window.speechSynthesis && window.speechSynthesis.speaking) {
                                        window.speechSynthesis.cancel();
                                        setIsAiSpeaking(false);
                                        if (utteranceRef.current) utteranceRef.current = null;
                                    }
                                    setCandidateText(e.target.value);
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                placeholder="Type your response to the interviewer..."
                                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-primary-500"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isSending || !candidateText.trim()}
                                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                            >
                                Send
                            </button>
                        </div>
                    )}
                </main>
            ) : (
                /* ================= STAGE 2: AUTHENTIC HACKERRANK CODING WORKSPACE ================= */
                <main className="flex-1 flex overflow-hidden bg-[#0d1117] relative">
                    {/* LEFT PANEL: Problem Workspace with HackerRank Tabs */}
                    <div
                        style={{ width: `${leftPanelWidth}%` }}
                        className="flex flex-col bg-[#0d1117] overflow-hidden flex-shrink-0"
                    >
                        {/* Tab Bar */}
                        <div className="h-10 border-b border-[#30363d] bg-[#161b22] px-4 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setLeftTab('problem')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                                        leftTab === 'problem'
                                            ? 'bg-[#0d1117] text-white border-t-2 border-primary-500 shadow-sm'
                                            : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Problem Statement
                                </button>
                                <button
                                    onClick={() => setLeftTab('guidance')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                                        leftTab === 'guidance'
                                            ? 'bg-[#0d1117] text-white border-t-2 border-primary-500 shadow-sm'
                                            : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    Interviewer (Rohan)
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-[11px] text-green-400">Live 1-on-1 Interview</span>
                            </div>
                        </div>

                        {/* Tab Content: Problem */}
                        {leftTab === 'problem' && (
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-gray-200">
                                {/* Title & Meta tags */}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-100 mb-2">
                                        {codingChallenge?.title || 'Algorithmic Challenge'}
                                    </h2>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                            {codingChallenge?.difficulty || 'Medium'}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold text-gray-300 bg-[#161b22] border border-[#30363d]">
                                            Target: ~20 mins
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                            Active Coding Round
                                        </span>
                                    </div>
                                </div>

                                <hr className="border-[#30363d]" />

                                {/* Problem Description */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                        Problem Statement
                                    </h3>
                                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line font-sans">
                                        {codingChallenge?.description || 'Write an efficient solution to solve the given technical problem.'}
                                    </p>
                                </div>

                                {/* Function Description */}
                                {codingChallenge?.functionDescription && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                            Function Description
                                        </h3>
                                        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs text-gray-300 leading-relaxed font-mono">
                                            {codingChallenge.functionDescription}
                                        </div>
                                    </div>
                                )}

                                {/* Input & Output Format */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                            Input Format
                                        </h3>
                                        <p className="text-xs text-gray-300 bg-[#161b22] border border-[#30363d] rounded-lg p-2.5">
                                            {codingChallenge?.inputFormat || 'Passed directly into function arguments.'}
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                            Output Format
                                        </h3>
                                        <p className="text-xs text-gray-300 bg-[#161b22] border border-[#30363d] rounded-lg p-2.5">
                                            {codingChallenge?.outputFormat || 'Return the computed result matching the return type.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Constraints */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                        Constraints
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(codingChallenge?.constraints && codingChallenge.constraints.length > 0) ? (
                                            codingChallenge.constraints.map((c, i) => (
                                                <span key={i} className="font-mono text-xs text-gray-300 bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded">
                                                    {c}
                                                </span>
                                            ))
                                        ) : (
                                            <>
                                                <span className="font-mono text-xs text-gray-300 bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded">
                                                    2 &le; n &le; 10^5
                                                </span>
                                                <span className="font-mono text-xs text-gray-300 bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded">
                                                    Memory limit: 512 MB
                                                </span>
                                                <span className="font-mono text-xs text-gray-300 bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded">
                                                    Time limit: 2.0s
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Sample Test Cases */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                        Sample Test Cases
                                    </h3>
                                    <div className="space-y-4">
                                        {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                            ? codingChallenge.sampleTestCases
                                            : [
                                                {
                                                    input: 'nums = [2, 7, 11, 15], target = 9',
                                                    expectedOutput: '[0, 1]',
                                                    explanation: 'Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].'
                                                },
                                                {
                                                    input: 'nums = [3, 2, 4], target = 6',
                                                    expectedOutput: '[1, 2]',
                                                    explanation: 'Because nums[1] + nums[2] == 2 + 4 == 6, we return [1, 2].'
                                                }
                                            ]
                                        ).map((tc, idx) => (
                                            <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                                                        Sample Input {idx}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(tc.input);
                                                            setCopySuccessIndex(idx);
                                                            setTimeout(() => setCopySuccessIndex(null), 2000);
                                                        }}
                                                        className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 font-mono"
                                                    >
                                                        {copySuccessIndex === idx ? '✓ Copied' : 'Copy'}
                                                    </button>
                                                </div>
                                                <pre className="bg-[#0d1117] p-2.5 rounded font-mono text-xs text-green-400 border border-[#30363d] overflow-x-auto">
                                                    {tc.input}
                                                </pre>

                                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                                                    Sample Output {idx}
                                                </span>
                                                <pre className="bg-[#0d1117] p-2.5 rounded font-mono text-xs text-blue-400 border border-[#30363d] overflow-x-auto">
                                                    {tc.expectedOutput}
                                                </pre>

                                                {tc.explanation && (
                                                    <div className="pt-1">
                                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                            Explanation
                                                        </span>
                                                        <p className="text-xs text-gray-300 leading-relaxed font-sans">
                                                            {tc.explanation}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Interviewer Notes & Live Chat */}
                        {leftTab === 'guidance' && (
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
                                <div className="space-y-3 overflow-y-auto mb-4">
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center font-bold text-xs text-white">
                                                R
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-200">Rohan (Senior Tech Lead)</p>
                                                <p className="text-[10px] text-gray-400">Observing your code & logic in real-time</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-mono">
                                            Live
                                        </span>
                                    </div>

                                    {transcript.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded-xl text-xs max-w-[90%] ${
                                                msg.role === 'ai'
                                                    ? 'bg-primary-950/40 border border-primary-500/20 text-gray-200 self-start'
                                                    : 'bg-[#161b22] border border-[#30363d] text-gray-300 self-end ml-auto'
                                            }`}
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                                                {msg.role === 'ai' ? 'Rohan' : 'You'}
                                            </span>
                                            <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Spoken / Query Dock inside Tab */}
                                <div className="border-t border-[#30363d] pt-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={toggleSpeechRecognition}
                                            className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                                                isListening
                                                    ? 'bg-red-600 text-white animate-pulse'
                                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                                            }`}
                                        >
                                            🎙️ {isListening ? 'Listening (Click to send)' : 'Talk to Rohan'}
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={candidateText}
                                            onChange={(e) => {
                                                if (window.speechSynthesis && window.speechSynthesis.speaking) {
                                                    window.speechSynthesis.cancel();
                                                    setIsAiSpeaking(false);
                                                    if (utteranceRef.current) utteranceRef.current = null;
                                                }
                                                setCandidateText(e.target.value);
                                            }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                            placeholder="Ask a question about the problem or explain your code..."
                                            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary-500"
                                        />
                                        <button
                                            onClick={() => handleSendMessage()}
                                            disabled={isSending || !candidateText.trim()}
                                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-lg disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* HORIZONTAL RESIZER SLIDER (Vertical divider bar) */}
                    <div
                        onMouseDown={() => setIsDraggingHorizontal(true)}
                        className={`w-1.5 ${
                            isDraggingHorizontal ? 'bg-[#1ba94c]' : 'bg-[#21262d]'
                        } hover:bg-[#1ba94c] active:bg-[#1ba94c] cursor-col-resize transition-colors flex items-center justify-center flex-shrink-0 group z-30 relative select-none`}
                        title="Drag left/right to resize problem description and code editor"
                    >
                        <div className="w-0.5 h-8 bg-gray-500 group-hover:bg-white rounded-full transition-colors"></div>
                    </div>

                    {/* RIGHT PANEL: HackerRank IDE & Runner */}
                    <div
                        ref={rightPanelRef}
                        style={{ width: `${100 - leftPanelWidth}%` }}
                        className="flex flex-col bg-[#0d1117] overflow-hidden flex-1 min-w-0"
                    >
                        {/* Editor Top Bar */}
                        <div className="h-10 border-b border-[#30363d] bg-[#161b22] px-4 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Language:</span>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => {
                                        const newLang = e.target.value;
                                        setSelectedLanguage(newLang);
                                        // If code is empty or basic, provide language starter
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
                                    className="bg-[#0d1117] border border-[#30363d] text-xs font-bold text-gray-200 px-2.5 py-1 rounded focus:outline-none focus:border-primary-500 font-mono"
                                >
                                    <option value="javascript">JavaScript (Node.js 24)</option>
                                    <option value="python">Python 3 (3.14)</option>
                                    <option value="cpp">C++ (GCC 6.3 / C++17)</option>
                                    <option value="java">Java (OpenJDK 24)</option>
                                </select>
                                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-gray-300 bg-[#0d1117] border border-[#30363d] px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    <span>Rohan watching live</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditorCode(codingChallenge?.starterCode || '')}
                                    className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800 transition-all flex items-center gap-1 font-mono text-[11px]"
                                    title="Reset code to default template"
                                >
                                    ↺ Reset Code
                                </button>
                            </div>
                        </div>

                        {/* Monaco Editor Canvas */}
                        <div className={`flex-1 min-h-0 bg-[#1e1e1e] overflow-hidden ${
                            isDraggingHorizontal || isDraggingVertical ? 'pointer-events-none select-none' : ''
                        }`}>
                            <Editor
                                height="100%"
                                language={selectedLanguage}
                                theme="vs-dark"
                                value={editorCode}
                                onChange={(value) => setEditorCode(value || '')}
                                options={{
                                    fontSize: 13,
                                    fontFamily: 'Fira Code, Menlo, Monaco, Consolas, Courier New, monospace',
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 4,
                                    lineNumbers: 'on',
                                    renderLineHighlight: 'all'
                                }}
                            />
                        </div>

                        {/* VERTICAL RESIZER SLIDER (Horizontal divider bar) */}
                        <div
                            onMouseDown={() => setIsDraggingVertical(true)}
                            className={`h-2 ${
                                isDraggingVertical ? 'bg-[#1ba94c]' : 'bg-[#21262d]'
                            } hover:bg-[#1ba94c] active:bg-[#1ba94c] cursor-row-resize transition-colors flex items-center justify-center flex-shrink-0 group z-30 relative select-none`}
                            title="Drag up/down to resize code editor and testcase console"
                        >
                            <div className="h-0.5 w-12 bg-gray-500 group-hover:bg-white rounded-full transition-colors"></div>
                        </div>

                        {/* HackerRank Bottom Runner Panel */}
                        <div
                            style={{ height: `${consoleHeight}px` }}
                            className="bg-[#0d1117] flex flex-col flex-shrink-0 border-t border-[#30363d] overflow-hidden"
                        >
                            {/* Console Header Bar */}
                            <div className="h-10 border-b border-[#30363d] bg-[#161b22] px-4 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setConsoleTab('testcases')}
                                        className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                                            consoleTab === 'testcases'
                                                ? 'bg-[#0d1117] text-white border-b-2 border-primary-500'
                                                : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        Test Cases
                                    </button>
                                    <button
                                        onClick={() => setConsoleTab('results')}
                                        className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1.5 ${
                                            consoleTab === 'results'
                                                ? 'bg-[#0d1117] text-white border-b-2 border-primary-500'
                                                : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        Execution Results
                                        {executionDetails.output && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${executionDetails.hasError ? 'bg-red-400' : 'bg-green-400'}`}></span>
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useCustomInput}
                                            onChange={(e) => setUseCustomInput(e.target.checked)}
                                            className="rounded border-gray-700 bg-gray-900 text-primary-600 focus:ring-0 w-3.5 h-3.5"
                                        />
                                        <span>Test against custom input</span>
                                    </label>
                                    {executionOutput && (
                                        <button
                                            onClick={() => { setExecutionOutput(''); setExecutionDetails({ hasError: false, executionTime: '', output: '' }); }}
                                            className="text-[11px] text-gray-500 hover:text-gray-300 font-mono"
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setConsoleHeight(consoleHeight <= 100 ? 280 : 94)}
                                        className="text-[11px] text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800 transition-colors flex items-center gap-1 font-mono border border-transparent hover:border-gray-700"
                                        title={consoleHeight <= 100 ? 'Expand console' : 'Minimize console'}
                                    >
                                        {consoleHeight <= 100 ? '▲ Expand' : '▼ Minimize'}
                                    </button>
                                </div>
                            </div>

                            {/* Console Body Area */}
                            <div className="flex-1 min-h-0 p-4 overflow-y-auto font-mono text-xs text-gray-300 bg-[#0d1117]">
                                {useCustomInput ? (
                                    <div className="h-full flex flex-col">
                                        <label className="text-[11px] font-bold text-gray-400 mb-1">
                                            Custom stdin input:
                                        </label>
                                        <textarea
                                            value={customInputText}
                                            onChange={(e) => setCustomInputText(e.target.value)}
                                            placeholder="Enter your custom input here..."
                                            className="flex-1 bg-[#161b22] border border-[#30363d] rounded p-2.5 text-xs text-gray-200 focus:outline-none focus:border-primary-500 font-mono resize-none"
                                        />
                                    </div>
                                ) : consoleTab === 'testcases' ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                                ? codingChallenge.sampleTestCases
                                                : [
                                                    { input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' },
                                                    { input: 'nums = [3, 2, 4], target = 6', expectedOutput: '[1, 2]' }
                                                ]
                                            ).map((tc, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveTestCase(idx)}
                                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                                        activeTestCase === idx
                                                            ? 'bg-[#161b22] text-green-400 border border-[#30363d]'
                                                            : 'text-gray-500 hover:text-gray-300'
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
                                            <div className="space-y-2">
                                                <div>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Compiler Input</span>
                                                    <pre className="bg-[#161b22] p-2 rounded text-xs text-gray-300 border border-[#30363d]">
                                                        {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                                            ? codingChallenge.sampleTestCases
                                                            : [
                                                                { input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' },
                                                                { input: 'nums = [3, 2, 4], target = 6', expectedOutput: '[1, 2]' }
                                                            ]
                                                        )[activeTestCase].input}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Expected Output</span>
                                                    <pre className="bg-[#161b22] p-2 rounded text-xs text-blue-400 border border-[#30363d]">
                                                        {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                                            ? codingChallenge.sampleTestCases
                                                            : [
                                                                { input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' },
                                                                { input: 'nums = [3, 2, 4], target = 6', expectedOutput: '[1, 2]' }
                                                            ]
                                                        )[activeTestCase].expectedOutput}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Execution Results */
                                    <div>
                                        {isRunningCode ? (
                                            <div className="flex items-center gap-2 text-gray-400 py-4">
                                                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span>Compiling and running against test suite...</span>
                                            </div>
                                        ) : executionDetails.output ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                            executionDetails.hasError
                                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                        }`}>
                                                            {executionDetails.hasError ? '✕ Runtime / Compilation Error' : '✓ Execution Finished'}
                                                        </span>
                                                        <span className="text-gray-500 text-[11px]">
                                                            Time: {executionDetails.executionTime || '0.04s'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <pre className={`p-3 rounded border text-xs whitespace-pre-wrap ${
                                                    executionDetails.hasError
                                                        ? 'bg-red-950/20 border-red-900/30 text-red-300'
                                                        : 'bg-[#161b22] border-[#30363d] text-green-300'
                                                }`}>
                                                    {executionDetails.output}
                                                </pre>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 py-4">
                                                Click "Run Code" below to compile and view execution results against sample test cases.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Live Interview Action Dock */}
                            <div className="h-14 border-t border-[#30363d] bg-[#161b22] px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    {/* Run Code Button */}
                                    <button
                                        onClick={handleRunCode}
                                        disabled={isRunningCode}
                                        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                                        title="Run code with sample or custom test inputs"
                                    >
                                        <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        {isRunningCode ? 'Compiling...' : 'Run Code'}
                                    </button>
                                    <span className="text-xs text-gray-400 font-mono hidden md:inline">
                                        {isRunningCode ? 'Compiling & running...' : executionDetails.output ? 'Output ready' : 'Test against sample or custom input'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Discuss Solution with Rohan */}
                                    <button
                                        onClick={() => {
                                            setLeftTab('guidance');
                                            handleSendMessage("I've finished writing and testing my solution. Rohan, please review it and walk through the implementation with me!");
                                        }}
                                        disabled={isSending}
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-700 to-primary-600 hover:from-purple-600 hover:to-primary-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-900/30 flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                                        title="Send solution to Rohan and switch to live review discussion"
                                    >
                                        <svg className="w-3.5 h-3.5 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                        {isSending ? 'Sending to Rohan...' : 'Discuss Solution with Rohan'}
                                    </button>

                                    {/* Finish Interview Button */}
                                    <button
                                        onClick={handleSubmitInterview}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs transition-all shadow-md shadow-red-900/30 flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                                        title="Conclude and submit the entire interview"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {isSubmitting ? 'Submitting...' : 'End Interview'}
                                    </button>
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
