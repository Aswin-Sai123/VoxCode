import React, { useState, useEffect } from 'react';
import { Mic, Terminal, Sliders, Play, CheckCircle2 } from 'lucide-react';

export const InteractiveWorkflowShowcase = () => {
    const [activeTab, setActiveTab] = useState('audio'); // 'audio' | 'sandbox' | 'rubric'

    // Audio tab simulation state
    const [interrupted, setInterrupted] = useState(false);

    // Sandbox tab simulation state
    const [isRunningCode, setIsRunningCode] = useState(false);

    // Rubric tab simulation state
    const [systemArchScore, setSystemArchScore] = useState(92);
    const [codeCorrectnessScore, setCodeCorrectnessScore] = useState(88);
    const [communicationScore, setCommunicationScore] = useState(94);

    const overallScore = Math.round(
        systemArchScore * 0.4 + codeCorrectnessScore * 0.35 + communicationScore * 0.25
    );

    const getVerdict = (score) => {
        if (score >= 90) return { label: 'Strong Hire', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        if (score >= 75) return { label: 'Hire', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
        if (score >= 60) return { label: 'Needs Improvement', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
        return { label: 'Reject', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    };

    const verdict = getVerdict(overallScore);

    // Automatic subtle waveform pulse
    const [waveCycle, setWaveCycle] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setWaveCycle(prev => (prev + 1) % 100);
        }, 120);
        return () => clearInterval(interval);
    }, []);

    const handleRunTests = () => {
        setIsRunningCode(true);
        setTimeout(() => {
            setIsRunningCode(false);
        }, 600);
    };

    return (
        <div className="w-full bg-[#121217] border border-[#232330] rounded-xl overflow-hidden shadow-2xl flex flex-col light-catch">
            {/* Top Engineering Tab Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0E0E12] border-b border-[#232330] text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2A2A38] inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2A2A38] inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2A2A38] inline-block" />
                    <span className="text-[#8B8B9E] ml-2 text-[10px] tracking-wider uppercase">LIVE ENGINE PREVIEW</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('audio')}
                        className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                            activeTab === 'audio'
                                ? 'bg-[#1C1C24] text-[#EDEDF0] font-semibold border border-[#333344]'
                                : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                        }`}
                    >
                        <Mic className="w-3 h-3 text-emerald-400" />
                        <span>Voice Turn-Taking</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('sandbox')}
                        className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                            activeTab === 'sandbox'
                                ? 'bg-[#1C1C24] text-[#EDEDF0] font-semibold border border-[#333344]'
                                : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                        }`}
                    >
                        <Terminal className="w-3 h-3 text-blue-400" />
                        <span>Monaco Sandbox</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('rubric')}
                        className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                            activeTab === 'rubric'
                                ? 'bg-[#1C1C24] text-[#EDEDF0] font-semibold border border-[#333344]'
                                : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                        }`}
                    >
                        <Sliders className="w-3 h-3 text-amber-400" />
                        <span>Calibrated Rubric</span>
                    </button>
                </div>
            </div>

            {/* Interactive Preview Canvas Body */}
            <div className="p-4 sm:p-5 flex-1 min-h-[200px]">
                {/* 1. AUDIO TURN-TAKING & BARGE-IN SLICE */}
                {activeTab === 'audio' && (
                    <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#8B8B9E]">
                            <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${interrupted ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                                <span>{interrupted ? 'CANDIDATE INTERRUPT DETECTED' : 'AI LEAD SPEAKING (BARGE-IN ARMED)'}</span>
                            </span>
                            <span className="text-[10px] text-[#555568]">LATENCY: 85ms · VAD: ACTIVE</span>
                        </div>

                        {/* Transcript Bubble Exchange */}
                        <div className="space-y-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-[#181820] border border-[#262636] space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-[#8B8B9E] font-mono">
                                    <span>ROHAN (AI LEAD)</span>
                                    <span>T+04:12</span>
                                </div>
                                <p className="text-[#EDEDF0] leading-relaxed">
                                    "How does your distributed rate limiter ensure consistent throughput when network partitions isolate a Redis cluster shard?"
                                </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-1 pl-3 border-l-2 border-l-blue-400">
                                <div className="flex items-center justify-between text-[10px] text-blue-400 font-mono">
                                    <span>CANDIDATE (LIVE INTERRUPTION)</span>
                                    <span>T+04:15 · +120ms barge-in</span>
                                </div>
                                <p className="text-[#D0D4DC] leading-relaxed">
                                    "We degrade gracefully to local token buckets with gossip-sync so isolated worker nodes never reject valid ingress traffic."
                                </p>
                            </div>
                        </div>

                        {/* Live Frequency Waveform Ribbon */}
                        <div className="pt-1 flex items-center justify-between gap-3 bg-[#0D0D11] p-2.5 rounded-lg border border-[#20202C]">
                            <div className="flex items-center gap-1.5 h-6">
                                {Array.from({ length: 28 }).map((_, i) => {
                                    const height = interrupted
                                        ? 4 + Math.sin((i + waveCycle) * 0.4) * 8
                                        : 4 + Math.abs(Math.sin((i * 0.6) + (waveCycle * 0.2))) * 16;
                                    return (
                                        <span
                                            key={i}
                                            style={{ height: `${Math.max(4, height)}px` }}
                                            className={`w-1 rounded-full transition-all duration-100 ${
                                                interrupted ? 'bg-amber-400' : 'bg-emerald-400'
                                            }`}
                                        />
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={() => setInterrupted(prev => !prev)}
                                className="px-2.5 py-1 text-[11px] font-mono rounded border border-[#333348] bg-[#16161F] hover:bg-[#20202C] text-[#EDEDF0] transition-colors whitespace-nowrap"
                            >
                                {interrupted ? 'Resume AI Speech' : 'Simulate Candidate Interrupt'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. MONACO SANDBOX MINI-DIFF SLICE */}
                {activeTab === 'sandbox' && (
                    <div className="space-y-3 font-mono text-xs animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[11px] text-[#8B8B9E]">
                            <span>NODE 20 SANDBOX · MEMORY CAP: 512MB</span>
                            <span className="text-emerald-400">ISOLATED PROCESS TREE</span>
                        </div>

                        {/* Mini Code Editor Window */}
                        <div className="bg-[#0A0A0E] border border-[#20202A] rounded-lg p-3 text-[11px] leading-relaxed space-y-1 overflow-x-auto text-[#A5B4FC]">
                            <div><span className="text-purple-400">function</span> <span className="text-blue-300">rateLimiter</span>(userId: <span className="text-emerald-400">string</span>): <span className="text-emerald-400">boolean</span> &#123;</div>
                            <div className="pl-4 text-[#8B8B9E]">// O(1) Sliding log in memory</div>
                            <div className="pl-4 text-[#D1D5DB]"><span className="text-purple-400">const</span> now = Date.now();</div>
                            <div className="pl-4 text-[#D1D5DB]"><span className="text-purple-400">const</span> timestamps = buckets.get(userId) || [];</div>
                            <div className="pl-4 text-[#D1D5DB]"><span className="text-purple-400">return</span> timestamps.length &lt; 100;</div>
                            <div>&#125;</div>
                        </div>

                        {/* Terminal Run Bar & Output */}
                        <div className="flex items-center justify-between bg-[#15151C] border border-[#252535] p-2.5 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-mono text-[#EDEDF0]">
                                    {isRunningCode ? 'Compiling in safe sandbox...' : 'All 3 Test Cases Passed (0.024s)'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleRunTests}
                                disabled={isRunningCode}
                                className="px-3 py-1 rounded text-[11px] font-mono bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                <Play className="w-3 h-3 fill-current" />
                                <span>{isRunningCode ? 'Executing...' : 'Run Test Suite'}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. CALIBRATED RUBRICS SCORE SLIDER SLICE */}
                {activeTab === 'rubric' && (
                    <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E]">
                                Recruiter Evaluation Matrix
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${verdict.color}`}>
                                {verdict.label} ({overallScore}%)
                            </span>
                        </div>

                        {/* Scrubbable Dimension Sliders */}
                        <div className="space-y-2.5">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-[#EDEDF0] font-mono">
                                    <span>System Architecture & Tradeoffs</span>
                                    <span className="text-blue-400">{systemArchScore}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="40"
                                    max="100"
                                    value={systemArchScore}
                                    onChange={(e) => setSystemArchScore(Number(e.target.value))}
                                    className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[#232330] rounded-lg"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-[#EDEDF0] font-mono">
                                    <span>Algorithm Correctness & Space-Time</span>
                                    <span className="text-emerald-400">{codeCorrectnessScore}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="40"
                                    max="100"
                                    value={codeCorrectnessScore}
                                    onChange={(e) => setCodeCorrectnessScore(Number(e.target.value))}
                                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#232330] rounded-lg"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-[#EDEDF0] font-mono">
                                    <span>Resume Project Defense & Clarity</span>
                                    <span className="text-amber-400">{communicationScore}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="40"
                                    max="100"
                                    value={communicationScore}
                                    onChange={(e) => setCommunicationScore(Number(e.target.value))}
                                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#232330] rounded-lg"
                                />
                            </div>
                        </div>

                        <p className="text-[11px] text-[#8B8B9E] font-mono pt-1">
                            Scrub any slider to preview how AI weighted hiring verdicts adapt across technical competencies.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InteractiveWorkflowShowcase;
