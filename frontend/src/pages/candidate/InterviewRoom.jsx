import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { 
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
    MessageSquare, 
    Maximize2, 
    Minimize2, 
    FileText, 
    MessageSquareCode, 
    Sun, 
    Moon, 
    Code,
    HelpCircle,
    User
} from 'lucide-react';
import { toast } from 'sonner';
import { playChime, playClick, playSuccess } from '../../utils/soundEffects';
import { getActivePhaseInfo, buildDefaultTimeline } from '../../utils/blueprintParser';
import VoiceVisualizerOrb from '../../components/common/VoiceVisualizerOrb';
import useInterviewSocket from '../../hooks/useInterviewSocket';
import useVAD from '../../hooks/useVAD';
import useAudioQueue from '../../hooks/useAudioQueue';
import LiveTranscript from '../../components/interview/LiveTranscript';
import AudioVisualizer from '../../components/interview/AudioVisualizer';

// Live YouTube/Karaoke-style dynamic animated speech caption renderer
const LiveCaptionsText = ({ text, isSpeaking, activeWordIndex }) => {
    if (!text) return null;
    const cleanText = text.replace(/[*_#`]/g, '').trim();

    // When idle or finished speaking, render the full clean text
    if (!isSpeaking || activeWordIndex < 0) {
        return <span className="text-[#EDEDF0] transition-colors duration-200">"{cleanText}"</span>;
    }

    const words = cleanText.split(/\s+/).filter(Boolean);
    const visibleCount = Math.min(words.length, activeWordIndex + 1);
    const visibleWords = words.slice(0, visibleCount);

    return (
        <span className="inline leading-relaxed">
            <span className="text-[#8B8B9E] font-serif mr-1">"</span>
            {visibleWords.map((word, idx) => {
                const isCurrent = idx === activeWordIndex;
                if (isCurrent) {
                    return (
                        <span key={idx} className="inline">
                            {idx > 0 && ' '}
                            <span className="text-yellow-400 font-bold transition-colors duration-75">
                                {word}
                            </span>
                        </span>
                    );
                }
                return (
                    <span key={idx} className="inline">
                        {idx > 0 && ' '}
                        <span className="text-white font-medium transition-colors duration-150">
                            {word}
                        </span>
                    </span>
                );
            })}
            {activeWordIndex >= words.length - 1 && (
                <span className="text-[#8B8B9E] font-serif ml-1">"</span>
            )}
        </span>
    );
};

const InterviewRoom = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { toggleTheme, isDark } = useTheme();

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

    // Live Word-by-Word YouTube-Style Captions state
    const [spokenWordIndex, setSpokenWordIndex] = useState(-1);
    const [speakingText, setSpeakingText] = useState('');
    const captionTimerRef = useRef(null);

    // Timer state
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(1800); // default 30m

    // Active blueprint timeline & pacing info
    const currentPhaseInfo = React.useMemo(() => {
        const totalMins = session?.durationMinutes || assessment?.durationMinutes || 30;
        const totalDurationSec = totalMins * 60;
        const elapsedSec = Math.max(0, totalDurationSec - timeLeftSeconds);
        const elapsedMins = Math.floor(elapsedSec / 60);
        const timeline = assessment?.blueprintAnalysis?.timeline?.length 
            ? assessment.blueprintAnalysis.timeline 
            : buildDefaultTimeline(totalMins, assessment?.codingRoundEnabled !== false);
        return getActivePhaseInfo(timeline, elapsedMins, totalMins);
    }, [session?.durationMinutes, assessment, timeLeftSeconds]);

    // Voice & Input state
    const [isListening, setIsListening] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [candidateText, setCandidateText] = useState('');
    const [interimSpeech, setInterimSpeech] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showTextInput, setShowTextInput] = useState(false);
    const [micError, setMicError] = useState('');
    const [selectedVoiceModel, setSelectedVoiceModel] = useState(() => {
        return location.state?.voiceModel || sessionStorage.getItem(`voxcode_voice_model_${code}`) || localStorage.getItem('voxcode_voice_model') || localStorage.getItem('voxcode_preferred_voice_model') || 'edge-neural-neerja';
    });
    const activeAudioRef = useRef(null);

    // Audio Queue for streaming chunks with sample-accurate scheduling & instantaneous flush
    const {
        queueAudioChunk,
        flushQueue,
        isPlaying: isQueuePlaying,
        analyser: queueAnalyser
    } = useAudioQueue();

    // Streaming & Real-time State
    const [streamingAiText, setStreamingAiText] = useState('');
    const [runningCri, setRunningCri] = useState(null);
    const [runningCriSignal, setRunningCriSignal] = useState(null);
    const [aiCodeComment, setAiCodeComment] = useState(null);
    const codeSnapshotTimerRef = useRef(null);
    const streamCommitTimerRef = useRef(null);

    // Persistent WebSocket Connection to /ws/interview
    const {
        connectionState: wsConnectionState,
        isConnected: isWsConnected,
        sendTextMessage,
        sendAudioChunk,
        sendCodeSnapshot,
        sendInterrupt,
        sendSilenceTimeout,
        sendProctoringEvent
    } = useInterviewSocket({
        sessionId: session?._id,
        autoConnect: Boolean(session?._id),
        onTextToken: (token) => {
            setIsAiSpeaking(true);
            setStreamingAiText(prev => prev + token);
        },
        onAudioChunk: (base64Audio, msg) => {
            setIsAiSpeaking(true);
            queueAudioChunk(base64Audio);
            if (msg?.sentence) {
                setSpeakingText(msg.sentence);
            }
        },
        onAiInterrupted: () => {
            flushQueue();
            setIsAiSpeaking(false);
            setStreamingAiText('');
            
        },
        onAiCodeComment: (commentText) => {
            setAiCodeComment(commentText);
            toast(`${interviewerName}'s Note`, {
                description: commentText,
                
            });
        },
        onCriUpdate: (newCri, newSignal) => {
            setRunningCri(newCri);
            setRunningCriSignal(newSignal);
        },
        onStageTransition: (newStage, newChallenge) => {
            if (newStage === 'CODING') {
                setTransitionBanner(true);
                setStage('CODING');
                if (newChallenge) {
                    setCodingChallenge(newChallenge);
                    setEditorCode(newChallenge.starterCode || '// Write your code here');
                    setSelectedLanguage(newChallenge.language || 'javascript');
                }
                setTimeout(() => setTransitionBanner(false), 5000);
            } else if (newStage === 'COMPLETED') {
                setTimeout(() => {
                    setStage('COMPLETED');
                }, 4000);
            }
        },
        onError: (errMsg) => {
            console.warn('[InterviewRoom WS Error]', errMsg);
        }
    });

    // Voice Activity Detection (VAD) for natural barge-in
    const {
        isSpeaking: isUserSpeakingVAD,
        volume: userVolume,
        startListening: startVAD,
        stopListening: stopVAD,
        isListening: isVADListening
    } = useVAD({
        onSpeechStart: () => {
            if (isAiSpeaking || isQueuePlaying) {
                flushQueue();
                if (isWsConnected) {
                    sendInterrupt();
                }
                if (activeAudioRef.current) {
                    activeAudioRef.current.pause();
                    activeAudioRef.current.currentTime = 0;
                    activeAudioRef.current = null;
                }
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setIsAiSpeaking(false);
                setStreamingAiText('');
                if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
                setSpokenWordIndex(-1);
            }
        },
        speechThreshold: 0.04
    });

    // Auto-commit streamed response to transcript when queue playback concludes or idle
    useEffect(() => {
        if (!isQueuePlaying && streamingAiText) {
            if (streamCommitTimerRef.current) clearTimeout(streamCommitTimerRef.current);
            streamCommitTimerRef.current = setTimeout(() => {
                const fullText = streamingAiText.trim();
                if (fullText) {
                    setLatestAiMessage(fullText);
                    setTranscript(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role === 'ai' && last?.text === fullText) return prev;
                        return [...prev, { role: 'ai', text: fullText, timestamp: new Date() }];
                    });
                    setStreamingAiText('');
                    setIsAiSpeaking(false);
                }
            }, 1200);
        }
        return () => {
            if (streamCommitTimerRef.current) clearTimeout(streamCommitTimerRef.current);
        };
    }, [isQueuePlaying, streamingAiText]);

    // Realistic 12-14s silence/hesitation detector: nudges candidate when silent
    const silenceTimerRef = useRef(null);
    useEffect(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        // Only monitor silence when AI is NOT speaking, user is NOT actively speaking or typing, and interview is running
        if (!isAiSpeaking && !isQueuePlaying && !isListening && !isSending && !candidateText.trim() && stage !== 'COMPLETED' && session?._id) {
            silenceTimerRef.current = setTimeout(() => {
                if (isWsConnected) {
                    sendSilenceTimeout();
                }
            }, 12000); // 12 seconds realistic interview pause
        }

        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, [isAiSpeaking, isQueuePlaying, isListening, isSending, candidateText, stage, session?._id, isWsConnected, sendSilenceTimeout]);

    const handleSelectVoiceModel = (modelId) => {
        setSelectedVoiceModel(modelId);
        try {
            localStorage.setItem('voxcode_voice_model', modelId);
        } catch {}
    };

    const getInterviewerName = (modelId) => {
        const id = (modelId || '').toLowerCase();
        if (id.includes('neerja') || id.includes('female')) return 'Neerja';
        return 'Prabhat';
    };
    const interviewerName = getInterviewerName(selectedVoiceModel);

    const getActiveVoiceLabel = (modelId) => {
        switch (modelId) {
            case 'edge-neural-neerja':
                return 'Edge Neerja';
            case 'edge-neural-prabhat':
                return 'Edge Prabhat';
            case 'browser-speech':
                return 'Browser Local';
            case 'google-cloud-neural':
                return 'GCP Neural2';
            default:
                return 'Edge Neural';
        }
    };

    // Coding state
    const [codingChallenge, setCodingChallenge] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [editorCode, setEditorCode] = useState('// Write your solution here\n');
    const [codeByLanguage, setCodeByLanguage] = useState({});
    const [executionOutput, setExecutionOutput] = useState('');
    const [isRunningCode, setIsRunningCode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [transitionBanner, setTransitionBanner] = useState(false);

    const handleLanguageChange = (newLang) => {
        // Preserve current code under the outgoing language
        setCodeByLanguage(prev => ({
            ...prev,
            [selectedLanguage]: editorCode
        }));
        setSelectedLanguage(newLang);
        try {
            localStorage.setItem(`voxcode_lang_${code}`, newLang);
        } catch {}

        // If candidate already wrote or switched to this language, restore it
        if (codeByLanguage[newLang] !== undefined) {
            setEditorCode(codeByLanguage[newLang]);
        } else {
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
    };

    // HackerRank IDE Tabs & Console state
    const [leftTab, setLeftTab] = useState('problem'); // 'problem' | 'guidance'
    const [consoleTab, setConsoleTab] = useState('testcases'); // 'testcases' | 'results'
    const [activeTestCase, setActiveTestCase] = useState(0);
    const [useCustomInput, setUseCustomInput] = useState(false);
    const [customInputText, setCustomInputText] = useState('');
    const [executionDetails, setExecutionDetails] = useState({ hasError: false, executionTime: '', output: '' });

    // Resizable split panels & console sliders
    const [leftPanelWidth, setLeftPanelWidth] = useState(45); // percentage
    const [consoleHeight, setConsoleHeight] = useState(250); // pixels
    const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
    const [isDraggingVertical, setIsDraggingVertical] = useState(false);
    const rightPanelRef = useRef(null);

    // Camera & Media State
    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [isWebcamMinimized, setIsWebcamMinimized] = useState(false);

    // Ensure webcam video element maintains srcObject if re-rendered
    useEffect(() => {
        if (!isWebcamMinimized && videoRef.current && mediaStreamRef.current) {
            if (videoRef.current.srcObject !== mediaStreamRef.current) {
                videoRef.current.srcObject = mediaStreamRef.current;
            }
            videoRef.current.play().catch(() => {});
        }
    }, [isWebcamMinimized]);

    const [isFullscreen, setIsFullscreen] = useState(false);

    // Monaco IDE Pro Bar & Customization state
    const [themeOverride, setThemeOverride] = useState(null); // null | 'vs-dark' | 'vs' | 'hc-black'
    const editorTheme = themeOverride || (isDark ? 'vs-dark' : 'vs');
    const setEditorTheme = (t) => setThemeOverride(t);
    const [editorFontSize, setEditorFontSize] = useState(13); // 12 | 13 | 14 | 16
    const [showCheatsheet, setShowCheatsheet] = useState(false);
    const monacoEditorRef = useRef(null);

    // Forward function references to eliminate hoisting / temporal dead zone warnings
    const speakAiMessageRef = useRef(null);
    const handleAutoSubmitRef = useRef(null);

    // Refs
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);
    const utteranceRef = useRef(null);
    const isMutedRef = useRef(false);

    // Media Stream: Webcam & Audio Monitoring Initialization
    useEffect(() => {
        let audioContext = null;
        let analyser = null;
        let animationFrame = null;

        const initMediaStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 320, height: 240, frameRate: 15 },
                    audio: true
                });
                mediaStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setCameraActive(true);

                // Setup Audio level monitoring with Web Audio API
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) {
                        audioContext = new AudioCtx();
                        const source = audioContext.createMediaStreamSource(stream);
                        analyser = audioContext.createAnalyser();
                        analyser.fftSize = 64;
                        source.connect(analyser);

                        const dataArray = new Uint8Array(analyser.frequencyBinCount);
                        const checkAudioLevel = () => {
                            if (!analyser) return;
                            analyser.getByteFrequencyData(dataArray);
                            let sum = 0;
                            for (let i = 0; i < dataArray.length; i++) {
                                sum += dataArray[i];
                            }
                            const avg = sum / dataArray.length;
                            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                            animationFrame = requestAnimationFrame(checkAudioLevel);
                        };
                        checkAudioLevel();
                    }
                } catch (audioErr) {
                    console.warn('Audio analyzer notice:', audioErr);
                }
            } catch (err) {
                console.warn('Camera/mic permission notice:', err);
                setCameraError('Camera/mic access not granted. Running in fallback mode.');
            }
        };

        initMediaStream();

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close().catch(() => {});
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Candidate Media Lifecycle (Webcam & Mic presence)
    useEffect(() => {
        if (!cameraActive) return;
        // Clean audio/video presence without surveillance loops
    }, [cameraActive]);

    // Real-Time Proctoring Telemetry: Tab switches, Window blur, Fullscreen exit, Code pastes
    const reportProctoring = useCallback((eventType, details) => {
        if (stage === 'COMPLETED') return;
        if (isWsConnected) {
            sendProctoringEvent(eventType, details);
        } else if (session?._id) {
            api.post('/interview/proctoring/event', {
                sessionId: session._id,
                eventType,
                details
            }).catch(() => {});
        }
    }, [stage, isWsConnected, sendProctoringEvent, session?._id]);

    // Window blur & tab switch listeners
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && stage !== 'COMPLETED') {
                reportProctoring('TAB_SWITCH', 'Candidate switched to another browser tab or minimized window');
                toast.warning('Tab Switch Detected: Please remain on the assessment screen.');
            }
        };

        const handleWindowBlur = () => {
            if (stage !== 'COMPLETED') {
                reportProctoring('WINDOW_BLUR', 'Candidate navigated outside interview window');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [stage, reportProctoring]);

    // Real-Time Face & Gaze Detection Loop (Native FaceDetector API with fallback)
    useEffect(() => {
        if (!cameraActive || stage === 'COMPLETED') return;

        let faceCheckInterval = null;
        let absentCounter = 0;
        let lookingDownCounter = 0;

        const checkFacePresence = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;

            try {
                if (window.FaceDetector) {
                    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
                    const faces = await detector.detect(videoRef.current);
                    
                    if (faces.length === 0) {
                        absentCounter++;
                        if (absentCounter === 3) {
                            reportProctoring('NO_FACE_DETECTED', 'No face detected in webcam frame for 6s');
                            toast.warning('Face Missing: Please stay facing your camera.');
                        }
                    } else if (faces.length > 1) {
                        absentCounter = 0;
                        reportProctoring('MULTIPLE_FACES', `Multiple faces detected in frame (${faces.length} people)`);
                        toast.error('Multiple Faces Detected: Ensure you are alone in the room.');
                    } else {
                        absentCounter = 0;
                        const box = faces[0].boundingBox;
                        const videoH = videoRef.current.videoHeight || 240;
                        if (box && box.bottom > videoH * 0.88) {
                            lookingDownCounter++;
                            if (lookingDownCounter === 3) {
                                reportProctoring('LOOKING_DOWN', 'Candidate repeatedly looking down away from monitor');
                                lookingDownCounter = 0;
                            }
                        } else {
                            lookingDownCounter = 0;
                        }
                    }
                }
            } catch (err) {
                // Ignore FaceDetector per-frame transient errors
            }
        };

        faceCheckInterval = setInterval(checkFacePresence, 2000);

        return () => {
            if (faceCheckInterval) clearInterval(faceCheckInterval);
        };
    }, [cameraActive, stage, reportProctoring]);
    useEffect(() => {
        const handleFullscreenChange = () => {
            const inFull = !!document.fullscreenElement;
            setIsFullscreen(inFull);
            if (!inFull && stage !== 'COMPLETED') {
                reportProctoring('FULLSCREEN_EXIT', 'Candidate exited full screen mode');
            }
        };

        const handleBeforeUnload = (e) => {
            if (stage !== 'COMPLETED') {
                e.preventDefault();
                e.returnValue = 'Interview in progress. Leaving this page will disrupt your live interview.';
                return e.returnValue;
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [stage]);

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

                const res = await api.post(`/interview/start/${code}`, {
                    resumeText
                });
                if (res.data.success) {
                    const data = res.data.data;
                    setSession(data.session);
                    setAssessment(data.assessment);
                    setStage(data.session.stage || 'CONCEPTUAL');
                    setTranscript(data.session.transcript || []);

                    // True server-authoritative elapsed time calculation
                    const totalDurationSec = (data.session.durationMinutes || data.assessment.durationMinutes || 30) * 60;
                    const startedTimeMs = new Date(data.session.startedAt || data.session.createdAt).getTime();
                    const elapsedSec = Math.max(0, Math.floor((Date.now() - startedTimeMs) / 1000));
                    const remainingSec = Math.max(0, totalDurationSec - elapsedSec);
                    setTimeLeftSeconds(remainingSec);

                    // Find latest AI message
                    const aiMsgs = data.session.transcript.filter(t => t.role === 'ai');
                    if (aiMsgs.length > 0) {
                        const firstMsg = aiMsgs[aiMsgs.length - 1].text;
                        setLatestAiMessage(firstMsg);
                        speakAiMessageRef.current?.(firstMsg);
                    }

                    if (data.session.codingChallenge) {
                        setCodingChallenge(data.session.codingChallenge);
                        const initialLang = data.session.language || 'javascript';
                        setSelectedLanguage(initialLang);
                        const initialCode = data.session.code || data.session.codingChallenge.starterCode || '// Write your code here';
                        setEditorCode(initialCode);
                        setCodeByLanguage({ [initialLang]: initialCode });
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
    }, [code, location.state]);

    // 2. Countdown Timer (Calculates true remaining time from server startedAt on every tick)
    useEffect(() => {
        if (!session || stage === 'COMPLETED') return;

        if (timerRef.current) clearInterval(timerRef.current);

        const totalDurationSec = (session.durationMinutes || assessment?.durationMinutes || 30) * 60;
        const startedTimeMs = new Date(session.startedAt || session.createdAt).getTime();

        const updateTimer = () => {
            const elapsedSec = Math.max(0, Math.floor((Date.now() - startedTimeMs) / 1000));
            const remainingSec = Math.max(0, totalDurationSec - elapsedSec);
            setTimeLeftSeconds(remainingSec);
            if (remainingSec <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                handleAutoSubmitRef.current?.();
            }
        };

        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);

        return () => clearInterval(timerRef.current);
    }, [session, stage, assessment]);

    // 3. Audio Output (TTS) with Multi-Engine Support (Edge Neural, Browser Speech, Google Cloud) & Live Word Tracking
    const speakAiMessage = async (text, overrideVoiceModel) => {
        if (!text || isMutedRef.current) return;

        // Play gentle chime when interviewer begins speaking
        playChime();

        // Auto-pause mic while AI speaks so the mic never catches the speakers
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        if (captionTimerRef.current) {
            clearTimeout(captionTimerRef.current);
            captionTimerRef.current = null;
        }

        // Cancel previous audio playback
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current.currentTime = 0;
            activeAudioRef.current = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        const cleanText = text.replace(/[*_#`]/g, '').trim();
        const words = cleanText.split(/\s+/).filter(Boolean);
        setSpeakingText(text);
        setSpokenWordIndex(0);

        // Precompute word character boundaries for exact boundary alignment
        const wordBoundaries = [];
        let currOffset = 0;
        words.forEach((w) => {
            const start = cleanText.indexOf(w, currOffset);
            const actualStart = start !== -1 ? start : currOffset;
            wordBoundaries.push({
                start: actualStart,
                end: actualStart + w.length
            });
            currOffset = actualStart + w.length;
        });

        let currentIdx = 0;
        let boundaryHandled = false;

        // Paced word-ticker fallback / duration-based karaoke sync
        const startWordTicker = (totalDurationMs) => {
            const estDuration = totalDurationMs || (words.length * 180);
            const interval = Math.max(80, Math.floor(estDuration / Math.max(1, words.length)));

            const advanceWord = () => {
                if (boundaryHandled) return;
                if (currentIdx < words.length - 1) {
                    currentIdx++;
                    setSpokenWordIndex(currentIdx);
                    const word = words[currentIdx] || '';
                    let delay = interval;
                    if (word.endsWith('.') || word.endsWith('?') || word.endsWith('!')) delay = interval * 1.6;
                    else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) delay = interval * 1.25;
                    else if (word.length > 7) delay = interval * 1.15;
                    captionTimerRef.current = setTimeout(advanceWord, delay);
                } else {
                    setTimeout(() => {
                        setIsAiSpeaking(false);
                        setSpokenWordIndex(-1);
                    }, 600);
                }
            };
            captionTimerRef.current = setTimeout(advanceWord, interval);
        };

        // Activate visual captions immediately
        setIsAiSpeaking(true);
        setSpokenWordIndex(0);

        const voiceModelToUse = overrideVoiceModel || selectedVoiceModel;

        // Mode 1: Browser Native Web Speech API
        if (voiceModelToUse === 'browser-speech') {
            startWordTicker();
            if (!window.speechSynthesis) return;

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utteranceRef.current = utterance;

            utterance.onboundary = (e) => {
                if (e.name === 'word' || typeof e.charIndex === 'number') {
                    boundaryHandled = true;
                    if (captionTimerRef.current) {
                        clearTimeout(captionTimerRef.current);
                        captionTimerRef.current = null;
                    }
                    const charIndex = e.charIndex;
                    let foundIndex = 0;
                    for (let i = 0; i < wordBoundaries.length; i++) {
                        if (charIndex >= wordBoundaries[i].start) {
                            foundIndex = i;
                        } else {
                            break;
                        }
                    }
                    setSpokenWordIndex(foundIndex);
                }
            };

            const setVoiceAndSpeak = () => {
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    const indianVoice = voices.find(v =>
                        (v.lang === 'en-IN' || v.lang === 'hi-IN') &&
                        (v.name.includes('Rishi') || v.name.includes('Veena') || v.name.includes('India') || v.name.includes('Google हिन्दी'))
                    ) || voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));

                    if (indianVoice) utterance.voice = indianVoice;
                }

                utterance.rate = 1.15;
                utterance.pitch = 0.98;

                utterance.onstart = () => {
                    setIsAiSpeaking(true);
                };

                utterance.onend = () => {
                    setIsAiSpeaking(false);
                    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
                    setSpokenWordIndex(-1);
                    utteranceRef.current = null;
                };

                utterance.onerror = (e) => {
                    console.warn('TTS notice (captions continuing via ticker):', e);
                    boundaryHandled = false;
                    if (!captionTimerRef.current && currentIdx < words.length - 1) {
                        startWordTicker();
                    }
                };

                try {
                    window.speechSynthesis.speak(utterance);
                } catch (err) {
                    console.warn('Speech synthesis dispatch fallback:', err);
                }
            };

            if (window.speechSynthesis.getVoices().length > 0) {
                setVoiceAndSpeak();
            } else {
                const handleVoices = () => {
                    setVoiceAndSpeak();
                    window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
                };
                window.speechSynthesis.addEventListener('voiceschanged', handleVoices);
            }
            return;
        }

        // Mode 2 & 3: Microsoft Edge Online Neural / Google Cloud Neural TTS
        try {
            const res = await api.post('/tts/synthesize', {
                text: cleanText,
                voiceModel: voiceModelToUse
            });

            if (res.data.success && res.data.data?.audioBase64) {
                const audio = new Audio(res.data.data.audioBase64);
                activeAudioRef.current = audio;

                audio.onloadedmetadata = () => {
                    const durationMs = (audio.duration || (words.length * 0.28)) * 1000;
                    startWordTicker(durationMs);
                };

                audio.onplay = () => {
                    setIsAiSpeaking(true);
                };

                audio.onended = () => {
                    setIsAiSpeaking(false);
                    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
                    setSpokenWordIndex(-1);
                    activeAudioRef.current = null;
                };

                audio.onerror = (err) => {
                    console.warn('Neural audio playback failed, falling back to browser speech:', err);
                    speakAiMessage(text, 'browser-speech');
                };

                await audio.play();
            } else {
                // Fallback to browser speech if audio could not be generated
                speakAiMessage(text, 'browser-speech');
            }
        } catch (err) {
            console.warn('Neural TTS request failed, fallback to browser speech:', err);
            speakAiMessage(text, 'browser-speech');
        }
    };

    // 4. Turn-by-Turn Speech Recognition with Continuous Capture
    const toggleSpeechRecognition = () => {
        if (isAiSpeaking || isQueuePlaying) {
            return; // Disabled while AI is talking; user must wait until AI finishes
        }

        playClick();
        if (isListening) {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
                setIsListening(false);
            }
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
        recognition.continuous = true; // Continuous listening so short natural pauses don't abort speech
        recognition.interimResults = true; // Live interim visual feedback
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setInterimSpeech('');
        };

        recognition.onresult = (event) => {
            flushQueue();
            if (isWsConnected) {
                sendInterrupt();
            }
            // Cut off AI audio immediately when user speaks
            if (activeAudioRef.current) {
                activeAudioRef.current.pause();
                activeAudioRef.current.currentTime = 0;
                activeAudioRef.current = null;
            }
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            setIsAiSpeaking(false);
            if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
            setSpokenWordIndex(-1);
            if (utteranceRef.current) utteranceRef.current = null;

            let interimStr = '';
            let finalStr = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const chunk = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalStr += chunk + ' ';
                } else {
                    interimStr += chunk;
                }
            }
            if (finalStr.trim()) {
                setCandidateText(prev => (prev ? prev + ' ' + finalStr.trim() : finalStr.trim()));
            }
            setInterimSpeech(interimStr.trim());
        };

        recognition.onerror = (e) => {
            console.warn('Speech recognition error:', e.error);
            setIsListening(false);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                setMicError('Microphone permission was denied. Please allow microphone in browser or switch to text mode.');
                setShowTextInput(true);
            } else if (e.error === 'no-speech') {
                // Ignore benign silence timeout
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
        // Stop active speech recognition and combine all spoken content
        if (recognitionRef.current && isListening) {
            try { recognitionRef.current.stop(); } catch {}
            setIsListening(false);
        }
        const textToSend = (customText || (candidateText + (interimSpeech ? ' ' + interimSpeech : ''))).trim();
        if (!textToSend || isSending) return;

        if (recognitionRef.current && isListening) {
            try { recognitionRef.current.stop(); } catch {}
            setIsListening(false);
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
        flushQueue();

        setIsSending(true);
        setCandidateText('');
        setInterimSpeech('');

        const userEntry = { role: 'candidate', text: textToSend, timestamp: new Date() };
        setTranscript(prev => [...prev, userEntry]);
        if (isWsConnected) {
            try {
                const sent = sendTextMessage(textToSend);
                if (sent) {
                    setIsSending(false);
                    return;
                }
            } catch (wsErr) {
                console.warn('[handleSendMessage] WebSocket send failed, falling back to REST:', wsErr);
            }
        }

        try {
            const res = await api.post('/interview/message', {
                sessionId: session?._id,
                code,
                message: textToSend,
                currentCode: editorCode,
                executionOutput,
                voiceModel: selectedVoiceModel
            });

            if (res.data.success) {
                const {
                    aiMessage,
                    stage: newStage,
                    codingChallenge: newChallenge,
                    transcript: updatedTranscript,
                    currentTopic: newTopic,
                    currentTopicIndex: newTopicIndex,
                    totalTopics: newTotalTopics
                } = res.data.data;

                setLatestAiMessage(aiMessage);
                if (updatedTranscript) setTranscript(updatedTranscript);
                if (newTopic) setCurrentTopic(newTopic);
                if (newTopicIndex !== undefined) setCurrentTopicIndex(newTopicIndex);
                if (newTotalTopics !== undefined) setTotalTopics(newTotalTopics);

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
            const errorMsg = 'Connection interrupted. Please repeat your response or send via text.';
            setTranscript(prev => [...prev, { role: 'ai', text: errorMsg, timestamp: new Date() }]);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendMessageRef = useRef(handleSendMessage);
    const toggleSpeechRecognitionRef = useRef(toggleSpeechRecognition);
    useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
        toggleSpeechRecognitionRef.current = toggleSpeechRecognition;
    });

    // Push-to-Talk (Hold Spacebar to speak) and Enter-to-transmit
    useEffect(() => {
        let spaceActive = false;

        const handleKeyDown = (e) => {
            const target = e.target;
            const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.monaco-editor');

            if (e.code === 'Space' && !isEditing && !e.repeat && !isAiSpeaking) {
                e.preventDefault();
                if (!isListening && !spaceActive) {
                    spaceActive = true;
                    toggleSpeechRecognitionRef.current();
                }
            } else if (e.key === 'Enter' && !isEditing && !e.shiftKey) {
                if (candidateText.trim() || interimSpeech.trim()) {
                    e.preventDefault();
                    handleSendMessageRef.current();
                }
            } else if (e.key === '?' && !isEditing && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                setShowCheatsheet(prev => !prev);
            }
        };

        const handleKeyUp = (e) => {
            const target = e.target;
            const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.monaco-editor');

            if (e.code === 'Space' && !isEditing && spaceActive) {
                e.preventDefault();
                spaceActive = false;
                if (isListening) {
                    toggleSpeechRecognitionRef.current();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isListening, isAiSpeaking, candidateText, interimSpeech]);

    // 6. Run Code (Sub-second Native Sandbox Runner)
    const handleRunCode = async () => {
        setIsRunningCode(true);
        setConsoleTab('results');
        setExecutionOutput('Compiling and executing code against sandbox test cases...');
        try {
            const res = await api.post('/interview/run-code', {
                language: selectedLanguage,
                code: editorCode,
                customInput: customInputText ? customInputText : undefined
            });
            if (res.data.success) {
                const out = res.data.data.output || 'Code executed with no stdout output.';
                setExecutionOutput(out);
                const hasErr = res.data.data.hasError || false;
                setExecutionDetails({
                    hasError: hasErr,
                    executionTime: res.data.data.executionTime || '0.20s',
                    output: out
                });
                if (!hasErr) {
                    playSuccess();
                    
                } else {
                    toast.error('Execution returned runtime or test failure');
                }
            }
        } catch (err) {
            const errMsg = `Execution failed: ${err.response?.data?.message || err.message}`;
            setExecutionOutput(errMsg);
            setExecutionDetails({
                hasError: true,
                executionTime: '0.00s',
                output: errMsg
            });
            toast.error('Execution error occurred');
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
            toast.success('Interview successfully submitted');
            setStage('COMPLETED');
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (err) {
            toast.error('Failed to submit interview: ' + (err.response?.data?.message || err.message));
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

    useEffect(() => {
        speakAiMessageRef.current = speakAiMessage;
        handleAutoSubmitRef.current = handleAutoSubmit;
    });

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
                                    Your mock interview for {assessment?.companyName} is complete. Your report card with scores and feedback is ready.
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
                                    onClick={() => navigate(`/candidate/reports/${session?._id}`)}
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
                                    Your interview responses have been sent directly to the {assessment?.companyName || 'company'} hiring team.
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
                                    <span className="text-[#8B8B9E]">Notice:</span>
                                    <span className="text-amber-400/90 font-medium">Delivered to Recruiter</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                Company assessment results are confidential to the recruiter. The hiring team will contact you regarding the next steps in their process.
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
                <div className="h-9 bg-amber-500/10 border-b border-amber-500/30 px-4 flex items-center text-xs text-amber-400">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>Let's move to the coding exercise — editor workspace is now ready.</span>
                    </span>
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

                {/* Center: Session status — no step spoilers */}
                <div className="hidden md:flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        stage === 'CODING'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : stage === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-[#141419] text-[#8B8B9E] border-[#363645]'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            stage === 'CODING' ? 'bg-blue-400 animate-pulse' :
                            stage === 'COMPLETED' ? 'bg-emerald-400' : 'bg-[#555568]'
                        }`} />
                        <span>
                            {stage === 'CODING' 
                                ? `Live Coding Exercise (${currentPhaseInfo.codingStartMinute}-${currentPhaseInfo.codingEndMinute}m)` 
                                : stage === 'COMPLETED' 
                                    ? 'Session Complete' 
                                    : (currentPhaseInfo.activePhaseTitle || 'Technical Discussion')}
                        </span>
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

                    {/* Theme Mode Toggle */}
                    <button
                        onClick={toggleTheme}
                        aria-label={isDark ? "Switch to white mode" : "Switch to dark mode"}
                        title={isDark ? "Switch to white mode" : "Switch to dark mode"}
                        className="studio-btn-secondary p-2 cursor-pointer"
                    >
                        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={() => {
                            if (!document.fullscreenElement) {
                                document.documentElement.requestFullscreen().catch(() => {});
                            } else {
                                document.exitFullscreen().catch(() => {});
                            }
                        }}
                        className="studio-btn-secondary p-2 cursor-pointer"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-[#8B8B9E]" />}
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
                        {isSubmitting ? 'Ending interview...' : confirmSubmit ? 'Confirm End Interview?' : 'End Interview'}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            {stage === 'CONCEPTUAL' ? (
                /* ================= STAGE 1: VOICE DISCUSSION STUDIO ================= */
                <main className="flex-1 flex flex-col items-center p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-5 overflow-y-auto pb-24">
                    {/* Interviewer Profile Avatar Card */}
                    <div className="w-full bg-[#141419] border border-[#232330] rounded-xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-sm">
                                    <User className="w-5 h-5" />
                                </div>
                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#141419] ${
                                    isAiSpeaking ? 'bg-emerald-400 animate-pulse' : isSending ? 'bg-amber-400 animate-pulse' : isListening ? 'bg-blue-400 animate-ping' : 'bg-[#555568]'
                                }`} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#EDEDF0] text-sm">{interviewerName}</span>
                                    <span className="text-[#555568] text-xs">• Lead Technical Interviewer</span>
                                </div>
                                <p className="text-[11px] text-[#8B8B9E]">1-on-1 Technical Dialogue ? Live</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <AudioVisualizer
                                analyser={queueAnalyser}
                                isActive={isAiSpeaking || isQueuePlaying || isListening || isUserSpeakingVAD}
                                barColor="#3B82F6"
                                width={120}
                                height={26}
                            />
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                            isAiSpeaking
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isSending
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : isListening
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                        : 'bg-[#0A0A0B] text-[#8B8B9E] border-[#232330]'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                isAiSpeaking ? 'bg-emerald-400 animate-pulse' : isSending ? 'bg-amber-400 animate-pulse' : isListening ? 'bg-blue-400 animate-ping' : 'bg-[#555568]'
                            }`} />
                            <span>{(isAiSpeaking || isQueuePlaying) ? 'Speaking' : isSending ? 'Thinking...' : (isListening || isUserSpeakingVAD) ? 'Listening' : 'Ready'}</span>
                        </span>
                        </div>
                    </div>

                    {/* Unified Conversation Dialogue Feed (No duplicate text card) */}
                    <div className="w-full flex-1 min-h-[320px] max-h-[520px]">
                        <LiveTranscript
                            transcript={transcript}
                            streamingAiText={streamingAiText}
                            candidateInterimText={interimSpeech}
                            isAiSpeaking={isAiSpeaking || isQueuePlaying}
                            isCandidateSpeaking={isListening || isUserSpeakingVAD}
                            cri={runningCri}
                            criSignal={runningCriSignal}
                            interviewerName={interviewerName}
                            connectionState={wsConnectionState}
                        />
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

                    {/* Speech transcript box */}
                    {(candidateText || interimSpeech || isListening) && (
                        <div className="w-full bg-[#141419] border border-[#232330] rounded-xl p-4 space-y-2 text-xs">
                            <div className="flex justify-between items-center text-xs text-[#8B8B9E]">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    {isListening ? 'Listening...' : 'Your response — edit before sending'}
                                </span>
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
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSendMessage()}
                                    disabled={isSending || (!candidateText.trim() && !interimSpeech.trim())}
                                    className="btn-primary text-xs py-1 px-3.5 font-medium"
                                >
                                    {isSending ? 'Sending...' : 'Send response'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Control Action Deck */}
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                            <button
                                onClick={toggleSpeechRecognition}
                                disabled={isAiSpeaking || isQueuePlaying}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all flex-1 sm:flex-initial ${
                                    isListening
                                        ? 'bg-red-600 text-white animate-pulse'
                                        : (isAiSpeaking || isQueuePlaying)
                                            ? 'bg-[#1C1C24] text-[#555568] border border-[#232330] cursor-not-allowed opacity-60'
                                            : 'btn-primary'
                                }`}
                                title={(isAiSpeaking || isQueuePlaying) ? `${interviewerName} is speaking... Please listen` : isListening ? 'Stop speaking' : 'Click to speak'}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                <span>
                                    {isListening 
                                        ? 'Stop speaking' 
                                        : (isAiSpeaking || isQueuePlaying) 
                                            ? `${interviewerName} is speaking...` 
                                            : 'Click to speak'}
                                </span>
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

                            {/* Push-to-Talk and Enter Keyboard Badges */}
                            <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-[#8B8B9E] pl-1">
                                <span className="px-2 py-0.5 rounded bg-[#1C1C24] border border-[#2B2B3B] text-[#EDEDF0]">
                                    [SPACE] Hold to speak
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#1C1C24] border border-[#2B2B3B] text-[#EDEDF0]">
                                    [ENTER] Send
                                </span>
                            </div>
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
                                    <p className="text-xs text-[#555568]">Solve in the editor and verify against test cases.</p>
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

                                {/* LeetCode-style Examples Section */}
                                {((codingChallenge?.sampleTestCases && codingChallenge.sampleTestCases.length > 0)
                                    ? codingChallenge.sampleTestCases
                                    : [
                                        { input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
                                        { input: 'nums = [3, 2, 4], target = 6', expectedOutput: '[1, 2]' }
                                    ]
                                ).map((tc, idx) => (
                                    <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-[#0A0A0B] border border-[#232330]">
                                        <span className="text-xs font-semibold text-[#EDEDF0] block">
                                            Example {idx + 1}:
                                        </span>
                                        <div className="space-y-1 font-mono text-[11px]">
                                            <div>
                                                <span className="text-[#8B8B9E]">Input: </span>
                                                <span className="text-[#EDEDF0]">{tc.input}</span>
                                            </div>
                                            <div>
                                                <span className="text-[#8B8B9E]">Output: </span>
                                                <span className="text-emerald-400">{tc.expectedOutput}</span>
                                            </div>
                                            {tc.explanation && (
                                                <div className="font-sans text-xs text-[#8B8B9E] pt-0.5">
                                                    <span className="text-[#555568]">Explanation: </span>
                                                    {tc.explanation}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

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
                                            <span className="font-medium text-[#EDEDF0]">{interviewerName} (Tech Lead)</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <AudioVisualizer
                                                analyser={queueAnalyser}
                                                isActive={isAiSpeaking || isQueuePlaying || isListening || isUserSpeakingVAD}
                                                barColor="#3B82F6"
                                                width={90}
                                                height={20}
                                            />
                                            <span className="text-xs text-[#555568]">Online</span>
                                        </div>
                                    </div>

                                    <div className="h-80 w-full">
                                        <LiveTranscript
                                            transcript={transcript}
                                            streamingAiText={streamingAiText}
                                            candidateInterimText={interimSpeech}
                                            isAiSpeaking={isAiSpeaking || isQueuePlaying}
                                            isCandidateSpeaking={isListening || isUserSpeakingVAD}
                                            cri={runningCri}
                                            criSignal={runningCriSignal}
                                            interviewerName={interviewerName}
                                            connectionState={wsConnectionState}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-[#232330] pt-3 space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={toggleSpeechRecognition}
                                            disabled={isAiSpeaking || isQueuePlaying}
                                            className={`p-2 rounded-lg text-xs flex items-center justify-center transition-colors flex-shrink-0 ${
                                                isListening
                                                    ? 'bg-red-600 text-white animate-pulse'
                                                    : (isAiSpeaking || isQueuePlaying)
                                                        ? 'bg-[#1C1C24] text-[#555568] border border-[#232330] cursor-not-allowed opacity-60'
                                                        : 'studio-btn-secondary text-[#8B8B9E] hover:text-[#EDEDF0]'
                                            }`}
                                            title={(isAiSpeaking || isQueuePlaying) ? `${interviewerName} is speaking...` : isListening ? "Stop voice listening" : `Click to speak to ${interviewerName}`}
                                        >
                                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        </button>
                                        <input
                                            type="text"
                                            value={candidateText}
                                            onChange={(e) => setCandidateText(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                            placeholder={isListening ? "Listening to microphone..." : "Ask a question or explain your approach..."}
                                            className="studio-input text-xs"
                                        />
                                        <button
                                            onClick={() => handleSendMessage()}
                                            disabled={isSending || (!candidateText.trim() && !interimSpeech.trim())}
                                            className="btn-primary px-3 text-xs"
                                        >
                                            Send
                                        </button>
                                    </div>
                                    {interimSpeech && (
                                        <p className="text-[10px] text-[#8B8B9E] italic px-1">
                                            Hearing: {interimSpeech}
                                        </p>
                                    )}
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
                        {/* Monaco IDE Pro Bar (h-10) */}
                        <div className="h-10 border-b border-[#232330] bg-[#141419] px-3 flex items-center justify-between flex-shrink-0 text-xs overflow-x-auto">
                            <div className="flex items-center gap-2 sm:gap-2.5">
                                <span className="text-[11px] text-[#8B8B9E] font-mono uppercase tracking-wider">Language:</span>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => handleLanguageChange(e.target.value)}
                                    className="bg-[#0A0A0B] border border-[#232330] text-xs text-[#EDEDF0] px-2 py-1 rounded-md focus:outline-none focus:border-blue-500 font-mono"
                                >
                                    <option value="javascript">JavaScript (Node.js 24)</option>
                                    <option value="python">Python 3 (3.14)</option>
                                    <option value="cpp">C++ (GCC 6.3 / C++17)</option>
                                    <option value="java">Java (OpenJDK 24)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={() => {
                                        setLeftTab('guidance');
                                        handleSendMessage(`I've finished writing and testing my solution. ${interviewerName}, please review it and walk through the implementation with me!`);
                                    }}
                                    className="studio-btn-secondary text-xs py-1 px-2.5 text-blue-400 hover:text-blue-300"
                                    title="Discuss solution with your interviewer"
                                >
                                    <MessageSquareCode className="w-3.5 h-3.5" />
                                    <span>Discuss solution</span>
                                </button>
                            </div>
                        </div>

                        {/* Live YouTube-style Voice Captions ticker overlay when interviewer is speaking */}
                        {isAiSpeaking && (
                            <div className="bg-[#141419]/95 border-b border-amber-500/30 px-4 py-2 flex items-center gap-3 backdrop-blur-md transition-all duration-200 z-20 shadow-md">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                    <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                                        {interviewerName}:
                                    </span>
                                </div>
                                <div className="text-xs text-[#EDEDF0] leading-relaxed flex-1 truncate sm:overflow-visible">
                                    <LiveCaptionsText
                                        text={speakingText || latestAiMessage}
                                        isSpeaking={true}
                                        activeWordIndex={spokenWordIndex}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Live AI Code Commentary Banner */}
                        {aiCodeComment && (
                            <div className="h-auto py-2 bg-[#181824] border-b border-amber-500/30 px-4 flex items-center justify-between gap-2 flex-shrink-0 animate-fadeIn">
                                <div className="flex items-center gap-2 text-xs text-amber-300">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                                    <span className="font-semibold text-amber-400">Interviewer Note:</span>
                                    <span className="italic">{aiCodeComment}</span>
                                </div>
                                <button
                                    onClick={() => setAiCodeComment(null)}
                                    className="text-[10px] text-[#8B8B9E] hover:text-white px-2 py-0.5 rounded bg-[#232330]"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {/* Monaco Editor Canvas */}
                        <div className="flex-1 min-h-0 bg-[#0A0A0B] overflow-hidden">
                            <Editor
                                height="100%"
                                language={selectedLanguage}
                                theme={editorTheme || (isDark ? "vs-dark" : "vs")}
                                value={editorCode}
                                onChange={(value) => {
                                    const val = value || '';
                                    setEditorCode(val);
                                    try {
                                        localStorage.setItem(`voxcode_code_${code}_${selectedLanguage}`, val);
                                    } catch {}
                                    if (isWsConnected) {
                                        if (codeSnapshotTimerRef.current) clearTimeout(codeSnapshotTimerRef.current);
                                        codeSnapshotTimerRef.current = setTimeout(() => {
                                            sendCodeSnapshot(val, selectedLanguage);
                                        }, 800);
                                    }
                                }}
                                onMount={(editor) => {
                                    monacoEditorRef.current = editor;
                                }}
                                options={{
                                    fontSize: editorFontSize,
                                    fontFamily: '"JetBrains Mono", Consolas, monospace',
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 4,
                                    lineNumbers: 'on',
                                    renderLineHighlight: 'all'
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
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-medium text-[#EDEDF0]">Custom Input</span>
                                    {executionDetails.output && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                            executionDetails.hasError
                                                ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                        }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                            <span>{executionDetails.hasError ? 'Error' : 'Output ready'}</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setConsoleHeight(consoleHeight <= 90 ? 250 : 80)}
                                        className="text-xs text-[#8B8B9E] hover:text-[#EDEDF0]"
                                    >
                                        {consoleHeight <= 90 ? 'Expand' : 'Collapse'}
                                    </button>
                                </div>
                            </div>

                            {/* Console Body Area: Custom input & Execution output side-by-side or stacked */}
                            <div className="flex-1 min-h-0 p-3 overflow-y-auto text-xs text-[#EDEDF0] bg-[#0A0A0B]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                                    <div className="flex flex-col h-full min-h-[90px]">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-mono text-[#8B8B9E]">Standard Input (stdin)</span>
                                            {customInputText && (
                                                <button
                                                    onClick={() => setCustomInputText('')}
                                                    className="text-[10px] text-[#555568] hover:text-[#8B8B9E]"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <textarea
                                            value={customInputText}
                                            onChange={(e) => setCustomInputText(e.target.value)}
                                            placeholder="Input test case..."
                                            className="flex-1 w-full bg-[#141419] border border-[#232330] rounded-lg p-2.5 text-xs font-mono text-[#EDEDF0] resize-none focus:outline-none focus:border-blue-500 min-h-[70px]"
                                        />
                                    </div>

                                    <div className="flex flex-col h-full min-h-[90px]">
                                        <span className="text-[11px] font-mono text-[#8B8B9E] mb-1">Execution Output</span>
                                        <div className="flex-1 w-full bg-[#141419] border border-[#232330] rounded-lg p-2.5 text-xs font-mono overflow-y-auto min-h-[70px]">
                                            {isRunningCode ? (
                                                <div className="flex items-center gap-2 text-[#8B8B9E] py-2">
                                                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Compiling and executing...</span>
                                                </div>
                                            ) : executionDetails.output ? (
                                                <pre className="whitespace-pre-wrap text-[#EDEDF0]">
                                                    {executionDetails.output}
                                                </pre>
                                            ) : (
                                                <span className="text-[#555568] italic">No output yet</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Interview Action Dock (h-12) */}
                            <div className="h-12 border-t border-[#232330] bg-[#141419] px-4 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleRunCode}
                                        disabled={isRunningCode}
                                        className="btn-primary text-xs py-1.5 px-3.5"
                                        title="Run code with custom input"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>{isRunningCode ? 'Running...' : 'Run Code'}</span>
                                    </button>
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {/* Candidate Self-View Video Tile (Clean professional interview webcam preview) */}
            <div className="fixed bottom-4 right-4 z-40 w-44 rounded-xl overflow-hidden shadow-2xl border border-[#232330] bg-[#141419]/90 backdrop-blur-md">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#0A0A0B]/80 text-[10px] text-[#8B8B9E] border-b border-[#232330]">
                    <span className="flex items-center gap-1.5 font-medium text-[#EDEDF0]">
                        <span className={`w-1.5 h-1.5 rounded-full ${cameraActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span>You (Candidate)</span>
                    </span>
                    <button
                        onClick={() => setIsWebcamMinimized(!isWebcamMinimized)}
                        className="text-[#8B8B9E] hover:text-[#EDEDF0] p-0.5 cursor-pointer"
                        title={isWebcamMinimized ? "Expand camera preview" : "Minimize camera preview"}
                    >
                        {isWebcamMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                    </button>
                </div>
                {!isWebcamMinimized && (
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover transform -scale-x-100 ${cameraActive ? 'block' : 'hidden'}`}
                        />
                        {!cameraActive && (
                            <div className="p-2 text-center text-[10px] text-[#8B8B9E] space-y-1">
                                <span>{cameraError || 'Camera standby'}</span>
                            </div>
                        )}
                        {/* Audio activity indicator */}
                        {cameraActive && (
                            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] text-[#EDEDF0]">
                                <Mic className="w-2.5 h-2.5 text-emerald-400" />
                                <div className="flex-1 h-1 bg-[#232330] rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${Math.min(100, audioLevel * 1.5)}%` }}
                                        className="h-full bg-emerald-400 transition-all duration-75"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Keyboard Shortcuts Cheatsheet Modal */}
            {showCheatsheet && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#141419] border border-[#232330] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left light-catch">
                        <div className="flex items-center justify-between border-b border-[#232330] pb-3">
                            <div className="flex items-center gap-2">
                                <Code className="w-4 h-4 text-blue-400" />
                                <h3 className="text-sm font-semibold text-[#EDEDF0]">Interview & IDE Shortcuts</h3>
                            </div>
                            <button
                                onClick={() => setShowCheatsheet(false)}
                                className="text-[#8B8B9E] hover:text-white text-xs px-2 py-0.5 rounded border border-[#232330] cursor-pointer"
                            >
                                ESC
                            </button>
                        </div>
                        <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-[#232330]/60">
                                <span className="text-[#8B8B9E]">Push-to-Talk (Walkie Talkie)</span>
                                <kbd className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0] font-mono">[Space] Hold</kbd>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#232330]/60">
                                <span className="text-[#8B8B9E]">Send Spoken Answer</span>
                                <kbd className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0] font-mono">Enter</kbd>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#232330]/60">
                                <span className="text-[#8B8B9E]">Prettier Format Code</span>
                                <kbd className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0] font-mono">Shift + Alt + F</kbd>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#232330]/60">
                                <span className="text-[#8B8B9E]">Toggle Shortcuts Modal</span>
                                <kbd className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0] font-mono">?</kbd>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCheatsheet(false)}
                            className="btn-primary w-full py-2 text-xs font-medium cursor-pointer"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            
        </div>
    );
};

export default InterviewRoom;
