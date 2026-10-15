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

    // Refs
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);
    const isMutedRef = useRef(false); // ref so speakAiMessage always reads the latest mute state

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

    // 3. Web Speech API — Text to Speech (AI voice)
    // Uses isMutedRef (not isMuted state) to avoid stale closure issues
    const speakAiMessage = (text) => {
        if (isMutedRef.current || !('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel(); // stop any current speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Choose a clean natural voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => setIsAiSpeaking(false);
        utterance.onerror = () => setIsAiSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // 4. Web Speech API — Speech Recognition (Microphone)
    const toggleSpeechRecognition = () => {
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

        // Stop AI speaking before candidate speaks
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsAiSpeaking(false);

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setInterimSpeech('');
        };

        recognition.onresult = (event) => {
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
                message: textToSend
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

    // 6. Run Code
    const handleRunCode = async () => {
        setIsRunningCode(true);
        setExecutionOutput('Executing code...');
        try {
            const res = await api.post('/interview/run-code', {
                language: selectedLanguage,
                code: editorCode
            });
            if (res.data.success) {
                setExecutionOutput(res.data.data.output || 'Code executed with no output.');
            }
        } catch (err) {
            setExecutionOutput(`Execution failed: ${err.response?.data?.message || err.message}`);
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
                    <p className="text-gray-400 text-sm mb-8">
                        Your interview conversation and coding solutions have been securely saved. The company will evaluate your performance in Module 4.
                    </p>

                    <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 mb-8 text-left space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Role:</span>
                            <span className="font-semibold text-gray-200">{assessment?.roleTitle}</span>
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

                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 font-bold rounded-xl transition-all shadow-lg shadow-primary-600/30 text-white"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
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
                                {isAiSpeaking ? 'Vox AI is speaking...' : isSending ? 'Vox AI is thinking...' : 'Listening to you'}
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
                                onChange={(e) => setCandidateText(e.target.value)}
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
                /* ================= STAGE 2: DYNAMIC SPLIT-SCREEN CODING ARENA ================= */
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                    {/* LEFT PANEL (5 cols): Problem Statement & Interviewer Dialogue */}
                    <div className="lg:col-span-5 border-r border-gray-800 flex flex-col bg-gray-900/50 overflow-hidden">
                        {/* Problem Header */}
                        <div className="p-6 border-b border-gray-800 flex-shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-md border border-primary-500/20">
                                Coding Challenge
                            </span>
                            <h3 className="text-xl font-bold text-gray-100 mt-2">
                                {codingChallenge?.title || 'Algorithm Challenge'}
                            </h3>
                        </div>

                        {/* Problem Description & Transcript Tabs */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Description</h4>
                                <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800 font-mono">
                                    {codingChallenge?.description || 'Solve the problem and run your code on the right.'}
                                </div>
                            </div>

                            {/* Interviewer Hint / Dialogue Stream */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Interviewer Guidance</h4>
                                <div className="bg-primary-950/20 border border-primary-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-2 h-2 rounded-full bg-primary-400"></span>
                                        <span className="text-xs font-bold text-primary-400">Vox AI</span>
                                    </div>
                                    <p className="text-sm text-gray-200">
                                        {latestAiMessage}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Left Footer: Voice Controls during coding */}
                        <div className="p-4 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between gap-3 flex-shrink-0">
                            <button
                                onClick={toggleSpeechRecognition}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                                    isListening
                                        ? 'bg-red-600 text-white animate-pulse'
                                        : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                                }`}
                            >
                                🎙️ {isListening ? 'Listening...' : 'Talk to Interviewer'}
                            </button>

                            {(candidateText || interimSpeech) && (
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={isSending}
                                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl"
                                >
                                    Send Spoken Query
                                </button>
                            )}

                            <span className="text-xs text-gray-500">
                                {isAiSpeaking ? 'AI speaking...' : 'Explain your logic aloud'}
                            </span>
                        </div>
                    </div>

                    {/* RIGHT PANEL (7 cols): Monaco Editor + Terminal Output */}
                    <div className="lg:col-span-7 flex flex-col bg-gray-950 overflow-hidden">
                        {/* Editor Controls Bar */}
                        <div className="h-12 border-b border-gray-800 bg-gray-900/60 px-4 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Language:</span>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 text-xs font-bold text-gray-200 px-3 py-1.5 rounded-lg focus:outline-none"
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditorCode(codingChallenge?.starterCode || '')}
                                    className="text-xs text-gray-400 hover:text-gray-200 px-2.5 py-1"
                                >
                                    Reset Starter
                                </button>
                                <button
                                    onClick={handleRunCode}
                                    disabled={isRunningCode}
                                    className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-green-600/20 disabled:opacity-50"
                                >
                                    ▶ {isRunningCode ? 'Running...' : 'Run Code'}
                                </button>
                            </div>
                        </div>

                        {/* Monaco Code Editor */}
                        <div className="flex-1 min-h-[300px]">
                            <Editor
                                height="100%"
                                language={selectedLanguage}
                                theme="vs-dark"
                                value={editorCode}
                                onChange={(value) => setEditorCode(value || '')}
                                options={{
                                    fontSize: 14,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 4
                                }}
                            />
                        </div>

                        {/* Bottom Output Console Terminal */}
                        <div className="h-44 border-t border-gray-800 bg-gray-950 p-4 flex flex-col flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Console Output
                                </span>
                                <button
                                    onClick={() => setExecutionOutput('')}
                                    className="text-xs text-gray-500 hover:text-gray-300"
                                >
                                    Clear
                                </button>
                            </div>
                            <pre className="flex-1 overflow-y-auto bg-gray-900/80 border border-gray-800/80 rounded-xl p-3 font-mono text-xs text-gray-200 whitespace-pre-wrap">
                                {executionOutput || 'Click "Run Code" to test and view execution output here...'}
                            </pre>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default InterviewRoom;
