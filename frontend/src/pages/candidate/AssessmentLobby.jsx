import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    Terminal, 
    ArrowRight, 
    Clock, 
    Mic, 
    Volume2, 
    Cpu, 
    ShieldCheck, 
    AlertCircle, 
    ChevronLeft,
    CheckCircle2,
    Code2,
    MessageSquare
} from 'lucide-react';

const AssessmentLobby = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyCode = async () => {
            try {
                const res = await api.get(`/assessments/join/${code}`);
                if (res.data.success) {
                    setAssessment(res.data.data);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Could not locate assessment manifest for this code.');
            } finally {
                setLoading(false);
            }
        };
        verifyCode();
    }, [code]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12 bg-[#09090B]">
                <div className="flex items-center gap-3 font-mono text-xs text-[#71717A]">
                    <span className="w-4 h-4 border-2 border-[#FAFAFA] border-t-transparent rounded-full animate-spin"></span>
                    <span>VERIFYING ASSESSMENT MANIFEST // {code}...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-[#09090B]">
                <div className="max-w-md w-full bg-[#111114] border border-[#F43F5E]/30 rounded-md p-6 space-y-4 font-mono text-center">
                    <div className="w-8 h-8 rounded bg-[#F43F5E]/10 border border-[#F43F5E]/30 flex items-center justify-center mx-auto text-[#F43F5E]">
                        <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-[#FAFAFA]">Assessment Verification Failed</h2>
                        <p className="text-xs text-[#71717A]">{error}</p>
                    </div>
                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="studio-btn-secondary w-full py-2 text-xs"
                    >
                        Return to Command Center
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#09090B] text-[#FAFAFA] p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-4">
            {/* Navigation Breadcrumb */}
            <div className="flex items-center justify-between">
                <Link
                    to="/candidate/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Workspace</span>
                </Link>
                <span className="studio-badge bg-[#111114] text-[#10B981] border-[#10B981]/25">
                    PRE-FLIGHT // STAGE 00
                </span>
            </div>

            {/* Main Pre-Flight Diagnostic Grid */}
            <div className="border border-[#222228] bg-[#111114] rounded-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#222228]">
                {/* Left Column: Assessment Protocol & Blueprint (7 Cols) */}
                <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
                    {/* Header Specification */}
                    <div className="space-y-2 border-b border-[#222228] pb-5">
                        <div className="flex items-center gap-2">
                            <span className="studio-badge bg-[#09090B] text-[#A1A1AA] border-[#222228]">
                                {assessment.companyName || 'Hiring Team'}
                            </span>
                            <span className="font-mono text-[11px] text-[#52525B]">
                                CODE: {assessment.assessmentCode || code}
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#FAFAFA]">
                            {assessment.title || assessment.roleTitle}
                        </h1>
                        <p className="text-xs text-[#71717A] font-mono leading-relaxed">
                            {assessment.roleTitle} • {assessment.experienceLevel || 'Mid-Senior'} Level • {assessment.durationMinutes || 30} Minutes Target
                        </p>
                    </div>

                    {/* Skill Specification Matrix */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                            Evaluated Competency Matrix:
                        </span>
                        <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                            {(assessment.skills || ['JavaScript', 'System Architecture', 'Algorithms']).map((skill, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-[#18181C] text-[#FAFAFA] border border-[#222228] text-[11px]"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 2-Phase Interview Protocol Steps */}
                    <div className="space-y-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                            Standard Autonomous Protocol:
                        </span>
                        
                        <div className="space-y-2 font-mono text-xs">
                            <div className="p-3 bg-[#09090B] border border-[#222228] rounded flex items-start gap-3">
                                <div className="w-5 h-5 rounded bg-[#18181C] border border-[#222228] flex items-center justify-center flex-shrink-0 text-[10px] font-semibold text-[#FAFAFA]">
                                    01
                                </div>
                                <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-[#FAFAFA]">Phase 01 // Voice Technical Screening</span>
                                        <span className="text-[10px] text-[#71717A]">~10m</span>
                                    </div>
                                    <p className="text-[#71717A] text-[11px]">
                                        Conversational voice dialogue with Rohan (AI Tech Lead). Verbal explanation of background, system principles, and trade-offs.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 bg-[#09090B] border border-[#222228] rounded flex items-start gap-3">
                                <div className="w-5 h-5 rounded bg-[#18181C] border border-[#222228] flex items-center justify-center flex-shrink-0 text-[10px] font-semibold text-[#FAFAFA]">
                                    02
                                </div>
                                <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-[#FAFAFA]">Phase 02 // Live Polyglot Coding</span>
                                        <span className="text-[10px] text-[#71717A]">~20m</span>
                                    </div>
                                    <p className="text-[#71717A] text-[11px]">
                                        HackerRank-style split-screen IDE. Solve an algorithmic problem using Python, C++, Java, or JavaScript with live execution against test suites.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Pre-Flight Hardware Readiness Console (5 Cols) */}
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-[#09090B]/40">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                            <span className="font-mono text-xs font-semibold uppercase text-[#FAFAFA]">
                                Environment Diagnostics
                            </span>
                            <span className="font-mono text-[10px] text-[#10B981] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                                4/4 VERIFIED
                            </span>
                        </div>

                        {/* Hardware Checklist Items */}
                        <div className="space-y-2.5 font-mono text-xs">
                            <div className="p-2.5 bg-[#111114] border border-[#222228] rounded flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#FAFAFA]">
                                    <Mic className="w-3.5 h-3.5 text-[#10B981]" />
                                    <span>Microphone Transceiver</span>
                                </div>
                                <span className="studio-badge bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                                    [READY]
                                </span>
                            </div>

                            <div className="p-2.5 bg-[#111114] border border-[#222228] rounded flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#FAFAFA]">
                                    <Volume2 className="w-3.5 h-3.5 text-[#10B981]" />
                                    <span>AI Voice Output Stream</span>
                                </div>
                                <span className="studio-badge bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                                    [READY]
                                </span>
                            </div>

                            <div className="p-2.5 bg-[#111114] border border-[#222228] rounded flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#FAFAFA]">
                                    <Cpu className="w-3.5 h-3.5 text-[#10B981]" />
                                    <span>Compiler Sandbox (Native)</span>
                                </div>
                                <span className="studio-badge bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                                    [READY]
                                </span>
                            </div>

                            <div className="p-2.5 bg-[#111114] border border-[#222228] rounded flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#FAFAFA]">
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                                    <span>Evaluation Pipeline</span>
                                </div>
                                <span className="studio-badge bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                                    [ONLINE]
                                </span>
                            </div>
                        </div>

                        <div className="p-3 bg-[#111114] border border-[#222228] rounded text-[11px] font-mono text-[#71717A] space-y-1">
                            <span className="text-[#A1A1AA] font-semibold uppercase block">Integrity Notice</span>
                            <p>
                                The session timer begins when you initialize. Code execution and transcripts are automatically preserved across network fluctuations.
                            </p>
                        </div>
                    </div>

                    {/* Launch CTA */}
                    <div className="space-y-2 pt-2">
                        <button
                            onClick={() => navigate(`/candidate/interview/${code}`)}
                            className="studio-btn-primary w-full py-3 text-xs font-mono font-semibold"
                        >
                            <span>Initialize Interview Session</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-[#52525B] text-center block">
                            ESTIMATED DURATION: {assessment.durationMinutes || 30} MINUTES
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssessmentLobby;
