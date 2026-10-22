import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Sparkles, 
    Sun, 
    Moon, 
    CameraOff, 
    ShieldAlert, 
    AlertTriangle,
    Move,
    HelpCircle,
    Code,
    Settings2,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { playChime, playClick, playSuccess, playWarning } from '../../utils/soundEffects';
import VoiceVisualizerOrb from '../../components/common/VoiceVisualizerOrb';

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

    // Resizable split panels & console sliders
    const [leftPanelWidth, setLeftPanelWidth] = useState(45); // percentage
    const [consoleHeight, setConsoleHeight] = useState(250); // pixels
    const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
    const [isDraggingVertical, setIsDraggingVertical] = useState(false);
    const rightPanelRef = useRef(null);

    // Proctoring & Anti-Cheat State
    const videoRef = useRef(null);
    const faceCanvasRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const blazeFaceModelRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [integrityScore, setIntegrityScore] = useState(100);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [violationAlert, setViolationAlert] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isWebcamMinimized, setIsWebcamMinimized] = useState(false);
    const [webcamCorner, setWebcamCorner] = useState('bottom-right'); // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    const [faceStatus, setFaceStatus] = useState('INITIALIZING'); // 'INITIALIZING' | 'VERIFIED' | 'ABSENT' | 'MULTIPLE'

    // Monaco IDE Pro Bar & Customization state
    const [editorTheme, setEditorTheme] = useState('vs-dark'); // 'vs-dark' | 'vs' | 'hc-black'
    const [editorFontSize, setEditorFontSize] = useState(13); // 12 | 13 | 14 | 16
    const [showCheatsheet, setShowCheatsheet] = useState(false);
    const monacoEditorRef = useRef(null);

    const missedFaceCountRef = useRef(0);
    const multipleFaceCountRef = useRef(0);
    const lastFaceViolationTimeRef = useRef(0);

    // Forward function references to eliminate hoisting / temporal dead zone warnings
    const speakAiMessageRef = useRef(null);
    const handleAutoSubmitRef = useRef(null);

    // Refs
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);
    const utteranceRef = useRef(null);
    const isMutedRef = useRef(false);

    const recordViolation = useCallback(async (eventType, details) => {
        try {
            playWarning();
            const sessId = session?._id;
            if (!sessId) return;

            setIntegrityScore(prev => {
                const deduction = 
                    eventType === 'TAB_SWITCH' ? 8 : 
                    eventType === 'SUSPICIOUS_PASTE' ? 12 : 
                    eventType === 'MULTIPLE_FACES' ? 12 :
                    eventType === 'FACE_ABSENT' ? 6 :
                    eventType === 'FACE_OBSTRUCTED' ? 5 : 4;
                return Math.max(0, prev - deduction);
            });

            if (eventType === 'TAB_SWITCH') {
                setTabSwitchCount(prev => prev + 1);
            }

            await api.post(`/interview/session/${sessId}/proctoring`, {
                eventType,
                details
            });
        } catch (err) {
            console.warn('Proctoring telemetry dispatch notice:', err);
        }
    }, [session]);

    // Live Proctoring: Webcam & Audio Monitoring Initialization
    useEffect(() => {
        let audioContext = null;
        let analyser = null;
        let animationFrame = null;

        const initProctoringMedia = async () => {
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
                console.warn('Proctoring camera/mic permission notice:', err);
                setCameraError('Camera/mic access not granted. Running in fallback mode.');
            }
        };

        initProctoringMedia();

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

    // Live AI Face Detection Engine (Google BlazeFace + Computer Vision Fallback)
    useEffect(() => {
        if (!cameraActive) return;

        let isCancelled = false;
        let detectionInterval = null;

        const loadBlazeFace = async () => {
            if (window.blazeface && window.tf) {
                try {
                    return await window.blazeface.load();
                } catch (e) {
                    console.warn('BlazeFace init error:', e);
                }
            }

            const loadScript = (src) => new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    if (existing.getAttribute('data-loaded') === 'true' || window.tf) return resolve();
                    existing.addEventListener('load', () => resolve());
                    existing.addEventListener('error', (e) => reject(e));
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => {
                    script.setAttribute('data-loaded', 'true');
                    resolve();
                };
                script.onerror = (e) => reject(e);
                document.head.appendChild(script);
            });

            try {
                await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js');
                await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js');
                if (window.blazeface) {
                    return await window.blazeface.load();
                }
            } catch (err) {
                console.warn('BlazeFace CDN fallback notice:', err);
            }
            return null;
        };

        loadBlazeFace().then(model => {
            if (!isCancelled && model) {
                blazeFaceModelRef.current = model;
            }
        });

        // Fast Color-Space & Pixel Luminance Analyzer Fallback
        const analyzeFramePresence = (video) => {
            try {
                const offCanvas = document.createElement('canvas');
                offCanvas.width = 64;
                offCanvas.height = 48;
                const oCtx = offCanvas.getContext('2d', { willReadFrequently: true });
                if (!oCtx) return { hasFace: true, count: 1 };
                oCtx.drawImage(video, 0, 0, 64, 48);
                const frame = oCtx.getImageData(0, 0, 64, 48);
                const d = frame.data;
                let skinPixels = 0;
                let totalBright = 0;
                const total = 64 * 48;

                for (let i = 0; i < d.length; i += 4) {
                    const r = d[i];
                    const g = d[i + 1];
                    const b = d[i + 2];
                    totalBright += (r + g + b) / 3;

                    // Approximate human skin-tone chrominance in RGB
                    if (r > 60 && g > 40 && b > 20 && (r > g) && (r > b) && (Math.abs(r - g) > 12)) {
                        skinPixels++;
                    }
                }

                const avgBright = totalBright / total;
                const skinRatio = skinPixels / total;

                // When user covers camera, turns off lights, hides face, or walks away:
                const hasFace = avgBright > 18 && skinRatio >= 0.055;
                return {
                    hasFace,
                    count: hasFace ? 1 : 0
                };
            } catch {
                return { hasFace: true, count: 1 };
            }
        };

        // Main detection frame loop (every 300ms)
        const runDetectionCycle = async () => {
            const video = videoRef.current;
            const canvas = faceCanvasRef.current;
            if (!video || !canvas || video.readyState < 2) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth || 320;
                canvas.height = video.videoHeight || 240;
            }

            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            let detectedFaces = [];

            if (blazeFaceModelRef.current) {
                try {
                    detectedFaces = await blazeFaceModelRef.current.estimateFaces(video, false);
                } catch {
                    detectedFaces = [];
                }
            } else {
                const fallback = analyzeFramePresence(video);
                if (fallback.hasFace) {
                    detectedFaces = [{
                        topLeft: [w * 0.22, h * 0.15],
                        bottomRight: [w * 0.78, h * 0.85],
                        probability: [0.92]
                    }];
                } else {
                    detectedFaces = [];
                }
            }

            const faceCount = detectedFaces.length;

            if (faceCount === 0) {
                missedFaceCountRef.current++;
                multipleFaceCountRef.current = 0;

                // Red warning reticle HUD on canvas
                ctx.strokeStyle = '#EF4444';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(10, 10, w - 20, h - 20);

                const cx = w / 2;
                const cy = h / 2;
                ctx.beginPath();
                ctx.moveTo(cx - 16, cy); ctx.lineTo(cx + 16, cy);
                ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy + 16);
                ctx.stroke();

                ctx.fillStyle = '#EF4444';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('[ NO FACE DETECTED ]', cx, cy + 30);
                ctx.textAlign = 'left';

                if (missedFaceCountRef.current >= 3) {
                    setFaceStatus('ABSENT');
                }

                // If face absent for ~2.1 seconds or recurring
                if (missedFaceCountRef.current === 7 || (missedFaceCountRef.current > 7 && missedFaceCountRef.current % 18 === 0)) {
                    const now = Date.now();
                    if (now - lastFaceViolationTimeRef.current > 8000) {
                        lastFaceViolationTimeRef.current = now;
                        recordViolation('FACE_ABSENT', 'Candidate moved out of camera view or covered face');
                        setViolationAlert({
                            title: 'Face Not Detected',
                            message: 'Your face is not visible in the camera frame. Please keep your camera uncovered and remain centered in front of the screen throughout the assessment.'
                        });
                    }
                }
            } else if (faceCount === 1) {
                missedFaceCountRef.current = 0;
                multipleFaceCountRef.current = 0;
                setFaceStatus('VERIFIED');

                const face = detectedFaces[0];
                const start = face.topLeft;
                const end = face.bottomRight;
                const boxW = end[0] - start[0];
                const boxH = end[1] - start[1];
                const corner = Math.min(boxW, boxH) * 0.25;

                // Cyber green corner target brackets
                ctx.strokeStyle = '#10B981';
                ctx.lineWidth = 2.5;

                // Top-Left
                ctx.beginPath();
                ctx.moveTo(start[0], start[1] + corner);
                ctx.lineTo(start[0], start[1]);
                ctx.lineTo(start[0] + corner, start[1]);
                ctx.stroke();

                // Top-Right
                ctx.beginPath();
                ctx.moveTo(start[0] + boxW - corner, start[1]);
                ctx.lineTo(start[0] + boxW, start[1]);
                ctx.lineTo(start[0] + boxW, start[1] + corner);
                ctx.stroke();

                // Bottom-Left
                ctx.beginPath();
                ctx.moveTo(start[0], start[1] + boxH - corner);
                ctx.lineTo(start[0], start[1] + boxH);
                ctx.lineTo(start[0] + corner, start[1] + boxH);
                ctx.stroke();

                // Bottom-Right
                ctx.beginPath();
                ctx.moveTo(start[0] + boxW - corner, start[1] + boxH);
                ctx.lineTo(start[0] + boxW, start[1] + boxH);
                ctx.lineTo(start[0] + boxW, start[1] + boxH - corner);
                ctx.stroke();

                // Center crosshair
                const cx = start[0] + boxW / 2;
                const cy = start[1] + boxH / 2;
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
                ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
                ctx.stroke();

                const prob = face.probability ? (face.probability[0] * 100).toFixed(0) : '95';
                ctx.fillStyle = '#10B981';
                ctx.font = '10px monospace';
                ctx.fillText(`Verified ${prob}%`, start[0], start[1] > 14 ? start[1] - 5 : start[1] + boxH + 12);

                if (face.landmarks) {
                    ctx.fillStyle = '#06B6D4';
                    for (const pt of face.landmarks) {
                        ctx.beginPath();
                        ctx.arc(pt[0], pt[1], 2, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            } else {
                // Multiple faces (> 1)
                missedFaceCountRef.current = 0;
                multipleFaceCountRef.current++;
                setFaceStatus('MULTIPLE');

                ctx.strokeStyle = '#F59E0B';
                ctx.lineWidth = 2.5;
                detectedFaces.forEach((f, idx) => {
                    const start = f.topLeft;
                    const end = f.bottomRight;
                    ctx.strokeRect(start[0], start[1], end[0] - start[0], end[1] - start[1]);
                    ctx.fillStyle = '#F59E0B';
                    ctx.font = 'bold 10px monospace';
                    ctx.fillText(`Person ${idx + 1}`, start[0], start[1] - 4);
                });

                if (multipleFaceCountRef.current >= 4) {
                    const now = Date.now();
                    if (now - lastFaceViolationTimeRef.current > 8000) {
                        lastFaceViolationTimeRef.current = now;
                        recordViolation('MULTIPLE_FACES', `Multiple faces (${faceCount}) detected in camera view`);
                        setViolationAlert({
                            title: 'Multiple Faces Detected',
                            message: 'More than one person was detected in your camera view. Only the candidate is permitted in the assessment area.'
                        });
                    }
                }
            }
        };

        detectionInterval = setInterval(runDetectionCycle, 300);

        return () => {
            isCancelled = true;
            if (detectionInterval) clearInterval(detectionInterval);
        };
    }, [cameraActive, recordViolation]);

    // Live Anti-Cheat: Visibility, Window Blur, Fullscreen, and Devtools Guard
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                recordViolation('TAB_SWITCH', 'Candidate switched away from interview tab');
                setViolationAlert({
                    title: 'Tab Switch Detected',
                    message: 'Leaving the interview window is logged as a proctoring violation. Return to this tab to prevent further score penalties.'
                });
            }
        };

        const handleWindowBlur = () => {
            recordViolation('WINDOW_BLUR', 'Interview window lost focus');
            setViolationAlert({
                title: 'Window Focus Lost',
                message: 'The interview window lost active focus. Please return to and keep this assessment window active.'
            });
        };

        const handleFullscreenChange = () => {
            const inFull = !!document.fullscreenElement;
            setIsFullscreen(inFull);
            if (!inFull && stage !== 'COMPLETED') {
                recordViolation('FULLSCREEN_EXIT', 'Candidate exited fullscreen mode');
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            setViolationAlert({
                title: 'Context Menu Restricted',
                message: 'Right-click context menu is restricted to maintain assessment integrity.'
            });
        };

        const handleKeyDown = (e) => {
            if (
                e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'u')
            ) {
                e.preventDefault();
                recordViolation('DEVTOOLS_ATTEMPT', `Keyboard shortcut attempt: ${e.key}`);
                setViolationAlert({
                    title: 'Developer Tools Restricted',
                    message: 'Developer tools inspection is prohibited during live assessments.'
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [session?._id, stage, recordViolation]);

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
                    setTimeLeftSeconds((data.assessment.durationMinutes || 30) * 60);

                    // Find latest AI message
                    const aiMsgs = data.session.transcript.filter(t => t.role === 'ai');
                    if (aiMsgs.length > 0) {
                        const firstMsg = aiMsgs[aiMsgs.length - 1].text;
                        setLatestAiMessage(firstMsg);
                        speakAiMessageRef.current?.(firstMsg);
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
    }, [code, location.state]);

    // 2. Countdown Timer
    useEffect(() => {
        if (!session || stage === 'COMPLETED') return;

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeftSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleAutoSubmitRef.current?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [session, stage]);

    // 3. Audio Output (TTS) with Indian Accent Preference & Live Karaoke-style Word Tracking
    const speakAiMessage = (text) => {
        if (!text || isMutedRef.current || !window.speechSynthesis) return;

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

        window.speechSynthesis.cancel();

        const cleanText = text.replace(/[*_#`]/g, '').trim();
        const words = cleanText.split(/\s+/).filter(Boolean);
        setSpeakingText(text);
        setSpokenWordIndex(0);

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utteranceRef.current = utterance;

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

        // Paced word-ticker fallback in case browser speech engine doesn't emit onboundary
        const startWordTicker = () => {
            const advanceWord = () => {
                if (boundaryHandled) return;
                if (currentIdx < words.length - 1) {
                    currentIdx++;
                    setSpokenWordIndex(currentIdx);
                    const word = words[currentIdx] || '';
                    let delay = 240;
                    if (word.endsWith('.') || word.endsWith('?') || word.endsWith('!')) delay = 450;
                    else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) delay = 320;
                    else if (word.length > 7) delay = 290;
                    captionTimerRef.current = setTimeout(advanceWord, delay);
                } else {
                    setTimeout(() => {
                        setIsAiSpeaking(false);
                        setSpokenWordIndex(-1);
                    }, 600);
                }
            };
            captionTimerRef.current = setTimeout(advanceWord, 240);
        };

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

        // Activate visual captions immediately
        setIsAiSpeaking(true);
        setSpokenWordIndex(0);
        startWordTicker();

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
                // Keep ticker running so the candidate still gets the visual word-by-word captions
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
            window.speechSynthesis.onvoiceschanged = () => {
                setVoiceAndSpeak();
                window.speechSynthesis.onvoiceschanged = null;
            };
        }
    };

    // 4. Clean Turn-by-Turn Speech Recognition (No live streaming jitter)
    const toggleSpeechRecognition = () => {
        playClick();
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
                if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
                setSpokenWordIndex(-1);
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
                    toggleSpeechRecognition();
                }
            } else if (e.key === 'Enter' && !isEditing && !e.shiftKey) {
                if (candidateText.trim() || interimSpeech.trim()) {
                    e.preventDefault();
                    handleSendMessage();
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
                    toggleSpeechRecognition();
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
                const hasErr = res.data.data.hasError || false;
                setExecutionDetails({
                    hasError: hasErr,
                    executionTime: res.data.data.executionTime || '0.20s',
                    output: out
                });
                if (!hasErr) {
                    playSuccess();
                    toast.success('Code executed successfully');
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
            confetti();
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

                {/* Center: Interactive Interview Stage Stepper */}
                <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
                    {[
                        { num: 1, label: 'Profile', active: stage === 'CONCEPTUAL' && currentTopicIndex === 0, done: stage === 'CODING' || currentTopicIndex > 0 },
                        { num: 2, label: 'Architecture Deep-Dive', active: stage === 'CONCEPTUAL' && currentTopicIndex > 0, done: stage === 'CODING' },
                        { num: 3, label: 'Coding Challenge', active: stage === 'CODING', done: stage === 'COMPLETED' },
                        { num: 4, label: 'Debrief', active: stage === 'COMPLETED', done: false }
                    ].map((step, idx, arr) => (
                        <React.Fragment key={step.num}>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                                    step.active
                                        ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                                        : step.done
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-[#1C1C24] text-[#8B8B9E] border border-[#2B2B3B]'
                                }`}>
                                    {step.done ? '✓' : step.num}
                                </span>
                                <span className={`text-[11px] font-medium transition-colors ${
                                    step.active ? 'text-[#EDEDF0]' : step.done ? 'text-emerald-400/80' : 'text-[#8B8B9E]'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                            {idx < arr.length - 1 && (
                                <span className="w-2.5 h-[1px] bg-[#2E2E3E]" />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="md:hidden flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        stage === 'CONCEPTUAL'
                            ? 'bg-[#141419] text-[#EDEDF0] border-[#363645]'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                        {stage === 'CONCEPTUAL' ? `Discussion (${currentTopicIndex + 1}/${totalTopics})` : 'Live Coding'}
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

                    {/* Fullscreen Anti-Cheat Mode Toggle */}
                    <button
                        onClick={() => {
                            if (!document.fullscreenElement) {
                                document.documentElement.requestFullscreen().catch(() => {});
                            } else {
                                document.exitFullscreen().catch(() => {});
                            }
                        }}
                        className="studio-btn-secondary p-2 cursor-pointer"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (Anti-Cheat Mode)"}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-[#8B8B9E]" />}
                    </button>

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

                        {/* Real-Time Web Audio Waveform & Glowing Voice Orb */}
                        <VoiceVisualizerOrb
                            isAiSpeaking={isAiSpeaking}
                            isListening={isListening}
                            isSending={isSending}
                            audioLevel={audioLevel}
                        />

                        <span className="text-xs text-[#555568]">
                            Interactive voice response active
                        </span>
                    </div>

                    {/* Question Card */}
                    <div className="w-full bg-[#141419] border border-[#232330] rounded-xl p-6 sm:p-7 space-y-4 relative overflow-hidden">
                        {isAiSpeaking && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
                        )}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                    Live Technical Discussion
                                </span>
                                {currentTopic && (
                                    <span className="px-2 py-0.5 rounded-md bg-[#1C1C24] text-[#8B8B9E] border border-[#262636] text-[11px] font-mono">
                                        {currentTopic} ({currentTopicIndex + 1}/{totalTopics})
                                    </span>
                                )}
                                {isAiSpeaking && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-semibold flex items-center gap-1.5 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                        <span>Live Captions</span>
                                    </span>
                                )}
                            </div>
                            <button
                                id="btn-repeat-question"
                                data-testid="repeat-question-btn"
                                onClick={() => speakAiMessage(latestAiMessage)}
                                className="studio-btn-secondary text-xs py-1 px-2.5"
                            >
                                <RotateCcw className="w-3 h-3 text-[#8B8B9E]" />
                                <span>Repeat question</span>
                            </button>
                        </div>
                        <div className="text-base sm:text-lg font-medium leading-relaxed min-h-[3.5rem] flex items-center">
                            <LiveCaptionsText
                                text={latestAiMessage || 'Initializing interview questions...'}
                                isSpeaking={isAiSpeaking}
                                activeWordIndex={spokenWordIndex}
                            />
                        </div>
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
                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
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

                            {/* Push-to-Talk and Enter Keyboard Badges */}
                            <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-[#8B8B9E] pl-1">
                                <span className="px-2 py-0.5 rounded bg-[#1C1C24] border border-[#2B2B3B] text-[#EDEDF0]">
                                    [SPACE] Hold to speak
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#1C1C24] border border-[#2B2B3B] text-[#EDEDF0]">
                                    [ENTER] Transmit
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

                                    {transcript.map((msg, i) => {
                                        const isLatestAi = msg.role === 'ai' && i === transcript.length - 1;
                                        return (
                                            <div
                                                key={i}
                                                className={`p-3 rounded-lg text-xs space-y-1 ${
                                                    msg.role === 'ai'
                                                        ? 'bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0]'
                                                        : 'bg-[#1C1C24] border border-[#363645] text-[#EDEDF0] ml-4'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-medium text-[#8B8B9E] block">
                                                        {msg.role === 'ai' ? 'Rohan (Tech Lead)' : 'You'}
                                                    </span>
                                                    {isLatestAi && isAiSpeaking && (
                                                        <span className="text-[10px] text-amber-300 font-mono flex items-center gap-1 animate-pulse">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                            speaking...
                                                        </span>
                                                    )}
                                                </div>
                                                {isLatestAi && isAiSpeaking ? (
                                                    <div className="leading-relaxed">
                                                        <LiveCaptionsText
                                                            text={msg.text}
                                                            isSpeaking={true}
                                                            activeWordIndex={spokenWordIndex}
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                                                )}
                                            </div>
                                        );
                                    })}
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
                        {/* Monaco IDE Pro Bar (h-10) */}
                        <div className="h-10 border-b border-[#232330] bg-[#141419] px-3 flex items-center justify-between flex-shrink-0 text-xs overflow-x-auto">
                            <div className="flex items-center gap-2 sm:gap-2.5">
                                <span className="text-[11px] text-[#8B8B9E] font-mono uppercase tracking-wider">Language:</span>
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
                                    className="bg-[#0A0A0B] border border-[#232330] text-xs text-[#EDEDF0] px-2 py-1 rounded-md focus:outline-none focus:border-blue-500 font-mono"
                                >
                                    <option value="javascript">JavaScript (Node.js 24)</option>
                                    <option value="python">Python 3 (3.14)</option>
                                    <option value="cpp">C++ (GCC 6.3 / C++17)</option>
                                    <option value="java">Java (OpenJDK 24)</option>
                                </select>

                                {/* Theme Switcher */}
                                <div className="hidden sm:flex items-center gap-1.5 pl-1">
                                    <span className="text-[11px] text-[#8B8B9E] font-mono">Theme:</span>
                                    <select
                                        value={editorTheme}
                                        onChange={(e) => setEditorTheme(e.target.value)}
                                        className="bg-[#0A0A0B] border border-[#232330] text-xs text-[#EDEDF0] px-1.5 py-1 rounded-md focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                                    >
                                        <option value="vs-dark">Dark (VS Dark)</option>
                                        <option value="vs">Light (VS Light)</option>
                                        <option value="hc-black">High Contrast</option>
                                    </select>
                                </div>

                                {/* Font Size Switcher */}
                                <div className="hidden md:flex items-center gap-1.5 pl-1">
                                    <span className="text-[11px] text-[#8B8B9E] font-mono">Font:</span>
                                    <select
                                        value={editorFontSize}
                                        onChange={(e) => setEditorFontSize(Number(e.target.value))}
                                        className="bg-[#0A0A0B] border border-[#232330] text-xs text-[#EDEDF0] px-1.5 py-1 rounded-md focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                                    >
                                        <option value={12}>12px</option>
                                        <option value={13}>13px</option>
                                        <option value={14}>14px</option>
                                        <option value={16}>16px</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2">
                                {/* Format Code Button */}
                                <button
                                    onClick={() => {
                                        if (monacoEditorRef.current) {
                                            monacoEditorRef.current.getAction('editor.action.formatDocument')?.run();
                                            toast.success('Document formatted');
                                        }
                                    }}
                                    className="studio-btn-secondary text-xs py-1 px-2.5 font-mono"
                                    title="Prettier Format Code (Shift+Alt+F)"
                                >
                                    <Code className="w-3 h-3 text-[#8B8B9E]" />
                                    <span className="hidden sm:inline">Format</span>
                                </button>

                                {/* Keyboard Shortcuts Cheatsheet Modal Trigger */}
                                <button
                                    onClick={() => setShowCheatsheet(true)}
                                    className="studio-btn-secondary text-xs py-1 px-2"
                                    title="IDE & Interview Keyboard Shortcuts (?)"
                                >
                                    <HelpCircle className="w-3.5 h-3.5 text-[#8B8B9E]" />
                                </button>

                                <button
                                    onClick={() => setEditorCode(codingChallenge?.starterCode || '')}
                                    className="studio-btn-secondary text-xs py-1 px-2.5"
                                    title="Reset code to default starter template"
                                >
                                    <RotateCcw className="w-3 h-3 text-[#8B8B9E]" />
                                    <span className="hidden sm:inline">Reset</span>
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

                        {/* Live YouTube-style Voice Captions ticker overlay when interviewer is speaking */}
                        {isAiSpeaking && (
                            <div className="bg-[#141419]/95 border-b border-amber-500/30 px-4 py-2 flex items-center gap-3 backdrop-blur-md transition-all duration-200 z-20 shadow-md">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                    <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                                        Rohan:
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

                        {/* Monaco Editor Canvas */}
                        <div className="flex-1 min-h-0 bg-[#0A0A0B] overflow-hidden">
                            <Editor
                                height="100%"
                                language={selectedLanguage}
                                theme={editorTheme || (isDark ? "vs-dark" : "vs")}
                                value={editorCode}
                                onChange={(value) => setEditorCode(value || '')}
                                onMount={(editor) => {
                                    monacoEditorRef.current = editor;
                                    editor.onDidPaste((e) => {
                                        const pasteLength = e.range ? (e.text?.length || 0) : 0;
                                        if (pasteLength > 40) {
                                            recordViolation('SUSPICIOUS_PASTE', `Pasted ${pasteLength} characters into code editor`);
                                            setViolationAlert({
                                                title: 'External Code Paste Detected',
                                                message: `You pasted ${pasteLength} characters. Large external code insertions are flagged in the assessment proctoring audit.`
                                            });
                                        }
                                    });
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

            {/* Floating Picture-in-Picture Live Proctoring Card */}
            <div className={`fixed ${
                webcamCorner === 'bottom-left' ? 'bottom-4 left-4' :
                webcamCorner === 'top-right' ? 'top-16 right-4' :
                webcamCorner === 'top-left' ? 'top-16 left-4' : 'bottom-4 right-4'
            } z-50 transition-all duration-300 shadow-2xl rounded-xl border border-[#232330] bg-[#141419]/95 backdrop-blur-md overflow-hidden ${
                isWebcamMinimized ? 'w-48' : 'w-64 sm:w-72'
            }`}>
                {/* Video Header Bar */}
                <div className="h-8 px-2.5 bg-[#0A0A0B] border-b border-[#232330] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <div className="relative flex items-center justify-center w-3 h-3">
                            <span className={`absolute w-full h-full rounded-full radar-ring ${
                                faceStatus === 'VERIFIED' ? 'bg-emerald-400' :
                                faceStatus === 'ABSENT' ? 'bg-red-500' :
                                faceStatus === 'MULTIPLE' ? 'bg-amber-400' : 'bg-zinc-400'
                            }`} />
                            <span className={`w-2 h-2 rounded-full relative z-10 ${
                                faceStatus === 'VERIFIED' ? 'bg-emerald-400' :
                                faceStatus === 'ABSENT' ? 'bg-red-500' :
                                faceStatus === 'MULTIPLE' ? 'bg-amber-400' : 'bg-zinc-400'
                            }`} />
                        </div>
                        <span className={`font-semibold tracking-wider uppercase text-[10px] ${
                            faceStatus === 'VERIFIED' ? 'text-emerald-400' :
                            faceStatus === 'ABSENT' ? 'text-red-400' :
                            faceStatus === 'MULTIPLE' ? 'text-amber-400' : 'text-zinc-400'
                        }`}>
                            {faceStatus === 'VERIFIED' ? 'FACE VERIFIED' :
                             faceStatus === 'ABSENT' ? 'FACE MISSING' :
                             faceStatus === 'MULTIPLE' ? 'MULTI-FACE' : 'INITIALIZING'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                            integrityScore >= 90 
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : integrityScore >= 75
                                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}>
                            {integrityScore}% Trust
                        </span>
                        {/* Snap-to-Corner Toggle Button */}
                        <button
                            onClick={() => {
                                const corners = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
                                const next = corners[(corners.indexOf(webcamCorner) + 1) % corners.length];
                                setWebcamCorner(next);
                                toast.info(`Webcam snapped to ${next.replace('-', ' ')}`);
                            }}
                            className="text-[#8B8B9E] hover:text-[#EDEDF0] p-0.5 cursor-pointer"
                            title="Snap webcam to different corner"
                        >
                            <Move className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => setIsWebcamMinimized(!isWebcamMinimized)}
                            className="text-[#8B8B9E] hover:text-[#EDEDF0] p-0.5 cursor-pointer"
                            title={isWebcamMinimized ? "Expand camera preview" : "Minimize camera preview"}
                        >
                            {isWebcamMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                        </button>
                    </div>
                </div>

                {/* Live Video Preview Screen with AI HUD Canvas Overlay */}
                {!isWebcamMinimized && (
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                        />
                        {/* Real-time Face Tracking HUD Canvas */}
                        <canvas
                            ref={faceCanvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 z-10"
                        />

                        {/* Visual Alert Banners on Video Preview */}
                        {cameraActive && faceStatus === 'ABSENT' && (
                            <div className="absolute top-2 left-2 right-2 z-20 bg-red-600/90 border border-red-400/80 text-white text-[10px] font-semibold py-1 px-2 rounded flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-sm animate-pulse">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span>Face Missing / Covered</span>
                            </div>
                        )}

                        {cameraActive && faceStatus === 'MULTIPLE' && (
                            <div className="absolute top-2 left-2 right-2 z-20 bg-amber-600/90 border border-amber-400/80 text-white text-[10px] font-semibold py-1 px-2 rounded flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-sm animate-pulse">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span>Multiple Faces Detected</span>
                            </div>
                        )}

                        {!cameraActive && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 text-center bg-[#0A0A0B]/90 text-xs text-[#8B8B9E] space-y-1">
                                <CameraOff className="w-5 h-5 text-amber-400" />
                                <span className="text-[11px]">{cameraError || 'Camera stream standby'}</span>
                            </div>
                        )}

                        {/* Audio level meter overlay pill */}
                        {cameraActive && (
                            <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-[#EDEDF0] border border-white/5">
                                <Mic className="w-3 h-3 text-emerald-400" />
                                <div className="flex-1 h-1.5 bg-[#232330] rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${Math.min(100, audioLevel * 1.5)}%` }}
                                        className={`h-full transition-all duration-75 ${
                                            audioLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                                        }`}
                                    />
                                </div>
                                <span className="text-[9px] font-mono text-[#8B8B9E]">
                                    {tabSwitchCount > 0 ? `${tabSwitchCount} tab flags` : 'Monitored'}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Live Proctoring Warning Modal / Toast */}
            {violationAlert && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#141419] border border-amber-500/40 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-sm font-semibold text-[#EDEDF0]">
                                {violationAlert.title}
                            </h3>
                            <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                {violationAlert.message}
                            </p>
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={() => setViolationAlert(null)}
                                className="btn-primary w-full py-2.5 text-xs font-medium cursor-pointer"
                            >
                                Acknowledge & Return to Test
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                <span className="text-[#8B8B9E]">Transmit Spoken Answer</span>
                                <kbd className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0] font-mono">Enter</kbd>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#232330]/60">
                                <span className="text-[#8B8B9E]">Prettier Format Code</span>
                                <kbd className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0] font-mono">Shift + Alt + F</kbd>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#232330]/60">
                                <span className="text-[#8B8B9E]">Global Command Palette</span>
                                <kbd className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[#EDEDF0] font-mono">⌘K / Ctrl+K</kbd>
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
