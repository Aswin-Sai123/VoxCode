import React, { useEffect, useRef } from 'react';
import { 
    Bot, 
    User, 
    Activity, 
    Mic, 
    Volume2, 
} from 'lucide-react';

/**
 * LiveTranscript: Real-time dialogue feed showing completed turns,
 * live AI token streaming, candidate interim speech, and CRI badges.
 */
export const LiveTranscript = ({
    transcript = [],
    streamingAiText = '',
    candidateInterimText = '',
    isAiSpeaking = false,
    isCandidateSpeaking = false,
    cri = null,
    criSignal = null,
    interviewerName = 'Interviewer',
    connectionState = 'connected',
    className = ''
}) => {
    const scrollBottomRef = useRef(null);
    const containerRef = useRef(null);

    // Auto-scroll to latest token or message
    useEffect(() => {
        if (scrollBottomRef.current) {
            scrollBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcript, streamingAiText, candidateInterimText]);

    const getSignalColor = (signal) => {
        switch (signal) {
            case 'strong':
                return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'adequate':
                return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'weak':
                return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            default:
                return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className={`flex flex-col h-full bg-[#121217] border border-[#232330] rounded-xl overflow-hidden shadow-xl ${className}`}>
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0E0E12] border-b border-[#232330] text-xs">
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-[#EDEDF0] tracking-wide uppercase text-[11px]">
                        Live Transcript
                    </span>
                    {/* Connection indicator */}
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border bg-[#141419] border-[#232330]">
                        {connectionState === 'connected' ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-400 font-medium">WS Live</span>
                            </>
                        ) : connectionState === 'reconnecting' ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                <span className="text-amber-400 font-medium">Reconnecting</span>
                            </>
                        ) : (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                <span className="text-rose-400 font-medium">REST Fallback</span>
                            </>
                        )}
                    </span>
                </div>

                {/* Status Badges: CRI & Speaker State */}
                <div className="flex items-center gap-2">
                    {cri !== null && cri !== undefined && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono ${getSignalColor(criSignal)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>CRI:</span>
                            <span className="font-bold">
                                {typeof cri === 'number' ? (cri > 10 ? cri : (cri * 10).toFixed(0)) : cri}
                            </span>
                            {criSignal && (
                                <span className="capitalize text-[10px] opacity-80">({criSignal})</span>
                            )}
                        </div>
                    )}

                    {isAiSpeaking && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[11px] animate-pulse">
                            <Volume2 className="w-3 h-3" />
                            <span>AI Speaking</span>
                        </div>
                    )}

                    {isCandidateSpeaking && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] animate-pulse">
                            <Mic className="w-3 h-3" />
                            <span>You Speaking</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable messages container - Displays only current turn (Current AI question & current candidate answer) */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-[#232330] scrollbar-track-transparent text-sm"
            >
                {(() => {
                    // Extract current turn: latest AI question and latest candidate answer
                    let latestAi = null;
                    let latestCandidate = null;

                    for (let i = transcript.length - 1; i >= 0; i--) {
                        const m = transcript[i];
                        const isAi = m.role === 'ai' || m.role === 'assistant';
                        if (isAi && !latestAi) {
                            latestAi = m;
                        } else if (!isAi && !latestCandidate && !latestAi) {
                            // Candidate answer responding to the previous question
                            latestCandidate = m;
                        } else if (!isAi && !latestCandidate && latestAi) {
                            latestCandidate = m;
                        }
                        if (latestAi && latestCandidate) break;
                    }

                    // Active turn list
                    const activeTurns = [];
                    if (latestAi && !streamingAiText) activeTurns.push(latestAi);
                    if (latestCandidate && !candidateInterimText) activeTurns.push(latestCandidate);

                    const hasContent = activeTurns.length > 0 || streamingAiText || candidateInterimText;

                    return (
                        <>
                            {!hasContent && (
                                <div className="flex flex-col items-center justify-center h-full text-[#8B8B9E] space-y-2 py-8">
                                    <Activity className="w-8 h-8 opacity-40 animate-pulse text-blue-400" />
                                    <p className="text-xs">Interview session active. Spoken dialogue and responses will appear here.</p>
                                </div>
                            )}

                            {activeTurns.map((msg, idx) => {
                                const isAi = msg.role === 'ai' || msg.role === 'assistant';
                                return (
                                    <div 
                                        key={idx}
                                        className={`flex gap-3 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                                            isAi 
                                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                                                : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                                        }`}>
                                            {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                        </div>

                                        <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed border ${
                                            isAi 
                                                ? 'bg-[#181822] border-[#2A2A3C] text-[#EDEDF0]' 
                                                : 'bg-[#13221E] border-[#1C3A30] text-[#D1F2E8]'
                                        }`}>
                                            <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-[#8B8B9E]">
                                                <span className="font-semibold text-[#A0A0B2]">
                                                    {isAi ? `${interviewerName} (Current Question)` : 'Your Answer'}
                                                </span>
                                                {msg.timestamp && (
                                                    <span className="font-mono">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="whitespace-pre-wrap">{msg.text}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    );
                })()}

                {/* Streaming AI response tokens (current question in progress) */}
                {streamingAiText && (
                    <div className="flex gap-3 items-start animate-fadeIn">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            <Bot className="w-4 h-4 animate-spin-slow" />
                        </div>
                        <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed border bg-[#181824] border-blue-500/40 text-[#EDEDF0] shadow-lg shadow-blue-500/5">
                            <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-blue-400">
                                <span className="font-semibold">{interviewerName} (streaming)</span>
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                            </div>
                            <div className="whitespace-pre-wrap">
                                {streamingAiText}
                                <span className="inline-block w-1.5 h-3 ml-1 bg-blue-400 animate-pulse align-middle" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Candidate interim speech */}
                {candidateInterimText && (
                    <div className="flex gap-3 items-start flex-row-reverse animate-fadeIn">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                            <Mic className="w-4 h-4 animate-pulse" />
                        </div>
                        <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed border bg-[#13241F] border-emerald-500/30 text-[#D1F2E8] italic">
                            <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-emerald-400 not-italic">
                                <span className="font-semibold">Transcribing...</span>
                            </div>
                            <div>{candidateInterimText}...</div>
                        </div>
                    </div>
                )}

                <div ref={scrollBottomRef} />
            </div>
        </div>
    );
};

export default LiveTranscript;
