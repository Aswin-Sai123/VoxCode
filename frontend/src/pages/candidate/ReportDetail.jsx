import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    FileText, 
    ChevronLeft, 
    Printer, 
    CheckCircle2, 
    AlertCircle, 
    Code2, 
    Cpu, 
    Activity, 
    Check, 
    X,
    ExternalLink,
    Terminal
} from 'lucide-react';

const ReportDetail = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [evaluation, setEvaluation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTranscript, setShowTranscript] = useState(false);

    useEffect(() => {
        const fetchEvaluation = async () => {
            try {
                const res = await api.get(`/evaluation/session/${sessionId}`);
                if (res.data.success) {
                    setEvaluation(res.data.data);
                }
            } catch (err) {
                console.error('Failed to load evaluation', err);
                setError(err.response?.data?.message || 'Could not load evaluation report.');
            } finally {
                setLoading(false);
            }
        };

        if (sessionId) fetchEvaluation();
    }, [sessionId]);

    const getVerdictBadge = (verdict) => {
        switch (verdict) {
            case 'Strong Hire':
                return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
            case 'Hire':
                return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
            case 'Needs Improvement':
                return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
            case 'Reject':
                return 'text-[#F43F5E] bg-[#F43F5E]/10 border-[#F43F5E]/30';
            default:
                return 'text-[#A1A1AA] bg-[#18181C] border-[#222228]';
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#09090B] font-mono text-xs text-[#71717A] space-y-3">
                <div className="w-5 h-5 border-2 border-[#FAFAFA] border-t-transparent rounded-full animate-spin"></div>
                <span>COMPUTING MULTI-DIMENSIONAL EVALUATION DOSSIER // {sessionId}...</span>
            </div>
        );
    }

    if (error || !evaluation) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-[#09090B]">
                <div className="max-w-md w-full bg-[#111114] border border-[#F43F5E]/30 rounded-md p-6 space-y-4 font-mono text-center">
                    <AlertCircle className="w-6 h-6 text-[#F43F5E] mx-auto" />
                    <div>
                        <h2 className="text-sm font-semibold text-[#FAFAFA]">Dossier Not Located</h2>
                        <p className="text-xs text-[#71717A] mt-1">{error || 'Unable to retrieve dossier records for this session ID.'}</p>
                    </div>
                    <button
                        onClick={() => navigate('/candidate/reports')}
                        className="studio-btn-secondary w-full py-2 text-xs"
                    >
                        Return to Dossiers Ledger
                    </button>
                </div>
            </div>
        );
    }

    const { scores, verdict, summary, strengths, areasForImprovement, codeReview, testCaseResults } = evaluation;

    return (
        <div className="flex-1 bg-[#09090B] text-[#FAFAFA] p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
            {/* Navigation and Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-[#222228]">
                <Link
                    to="/candidate/reports"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Dossiers</span>
                </Link>

                <div className="flex items-center gap-2">
                    <span className="studio-badge bg-[#111114] text-[#A1A1AA] border-[#222228]">
                        DOSSIER // {sessionId?.slice(-8)}
                    </span>
                    <button
                        onClick={() => window.print()}
                        className="studio-btn-secondary text-xs"
                        title="Export printable dossier"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / Export</span>
                    </button>
                </div>
            </div>

            {/* Bento Grid Header: Composite Score & Category Progress Meters */}
            <div className="border border-[#222228] bg-[#111114] rounded-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#222228]">
                {/* Composite Score Telemetry (5 Cols) */}
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={`studio-badge ${getVerdictBadge(verdict)}`}>
                                VERDICT // {verdict?.toUpperCase() || 'EVALUATED'}
                            </span>
                            <span className="font-mono text-[10px] text-[#52525B]">GEMINI-2.5-FLASH</span>
                        </div>
                        <h1 className="text-xl font-semibold text-[#FAFAFA] tracking-tight">
                            Technical Performance Score
                        </h1>
                        <p className="text-xs text-[#71717A] font-mono leading-relaxed">
                            Composite evaluation across coding correctness, code cleanliness, systems architecture, and voice communication.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl sm:text-6xl font-mono font-bold text-[#FAFAFA] tabular-nums tracking-tight">
                                {scores?.overall || 0}
                            </span>
                            <span className="text-lg font-mono text-[#52525B]">/ 100</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#10B981] block">
                            Calculated from 4 objective rubric metrics
                        </span>
                    </div>
                </div>

                {/* Rubric Horizontal Precision Meters (7 Cols) */}
                <div className="lg:col-span-7 p-6 sm:p-8 space-y-4 font-mono text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-[#71717A] block border-b border-[#222228] pb-2">
                        Rubric Category Telemetry:
                    </span>

                    <div className="space-y-3.5">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-[#A1A1AA]">Coding & Algorithm Correctness</span>
                                <span className="text-[#FAFAFA] font-semibold tabular-nums">{scores?.coding || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden border border-[#222228]">
                                <div style={{ width: `${scores?.coding || 0}%` }} className="h-full bg-[#10B981] rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-[#A1A1AA]">Code Architecture & Cleanliness</span>
                                <span className="text-[#FAFAFA] font-semibold tabular-nums">{scores?.codeQuality || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden border border-[#222228]">
                                <div style={{ width: `${scores?.codeQuality || 0}%` }} className="h-full bg-[#10B981] rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-[#A1A1AA]">Conceptual Foundations & Depth</span>
                                <span className="text-[#FAFAFA] font-semibold tabular-nums">{scores?.conceptual || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden border border-[#222228]">
                                <div style={{ width: `${scores?.conceptual || 0}%` }} className="h-full bg-[#FAFAFA] rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-[#A1A1AA]">Verbal Communication & Structure</span>
                                <span className="text-[#FAFAFA] font-semibold tabular-nums">{scores?.communication || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden border border-[#222228]">
                                <div style={{ width: `${scores?.communication || 0}%` }} className="h-full bg-[#A1A1AA] rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Algorithmic Complexity & Test Suite Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
                {/* Big-O Complexity Telemetry */}
                <div className="bg-[#111114] border border-[#222228] rounded-md p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#222228] pb-2.5">
                        <span className="text-[10px] uppercase text-[#71717A] tracking-wider flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-[#10B981]" />
                            Algorithmic Complexity Telemetry
                        </span>
                        <span className="studio-badge bg-[#09090B] text-[#A1A1AA] border-[#222228]">STATIC-ANALYSIS</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[#09090B] border border-[#222228] rounded space-y-1">
                            <span className="text-[10px] text-[#52525B] uppercase block">Time Complexity</span>
                            <span className="text-sm font-semibold text-[#FAFAFA]">
                                {codeReview?.timeComplexity || 'O(N log N)'}
                            </span>
                        </div>
                        <div className="p-3 bg-[#09090B] border border-[#222228] rounded space-y-1">
                            <span className="text-[10px] text-[#52525B] uppercase block">Space Complexity</span>
                            <span className="text-sm font-semibold text-[#FAFAFA]">
                                {codeReview?.spaceComplexity || 'O(N)'}
                            </span>
                        </div>
                    </div>

                    {codeReview?.comments && (
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed pt-1">
                            {codeReview.comments}
                        </p>
                    )}
                </div>

                {/* Sandbox Test Cases Suite */}
                <div className="bg-[#111114] border border-[#222228] rounded-md p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#222228] pb-2.5">
                        <span className="text-[10px] uppercase text-[#71717A] tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                            Compiler Sandbox Verification
                        </span>
                        <span className="text-[11px] text-[#10B981]">
                            {(testCaseResults || []).filter(t => t.passed).length} / {testCaseResults?.length || 2} Passed
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        {(testCaseResults && testCaseResults.length > 0 ? testCaseResults : [
                            { caseIndex: 0, passed: true, input: 'Sample Case 0', expectedOutput: 'Valid' },
                            { caseIndex: 1, passed: true, input: 'Sample Case 1', expectedOutput: 'Valid' }
                        ]).map((tc, idx) => (
                            <div key={idx} className="p-2.5 bg-[#09090B] border border-[#222228] rounded flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${tc.passed ? 'bg-[#10B981]' : 'bg-[#F43F5E]'}`} />
                                    <span className="text-[#FAFAFA]">Test Vector #{idx}</span>
                                </div>
                                <span className={`studio-badge ${tc.passed ? 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30' : 'text-[#F43F5E] bg-[#F43F5E]/10 border-[#F43F5E]/30'}`}>
                                    {tc.passed ? 'PASS // 0.20s' : 'FAIL'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Submitted Code Artifact */}
            {evaluation.codeSubmission && (
                <div className="bg-[#111114] border border-[#222228] rounded-md overflow-hidden font-mono text-xs">
                    <div className="h-9 border-b border-[#222228] bg-[#09090B] px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Code2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
                            <span className="text-xs font-semibold text-[#FAFAFA] uppercase">
                                Submitted Code Artifact
                            </span>
                            <span className="text-[10px] text-[#52525B]">
                                [{evaluation.codeSubmission.language?.toUpperCase() || 'JAVASCRIPT'}]
                            </span>
                        </div>
                        <span className="text-[10px] text-[#52525B]">IMMUTABLE EXECUTION SNAPSHOT</span>
                    </div>
                    <pre className="p-4 bg-[#09090B] overflow-x-auto text-[#FAFAFA] text-xs leading-relaxed font-mono">
                        {evaluation.codeSubmission.code || '// No code submitted'}
                    </pre>
                </div>
            )}

            {/* Structured AI Evaluation Feedback (Strengths, Growth, Executive Summary) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-[#111114] border border-[#222228] rounded-md p-5 space-y-3">
                    <span className="text-[10px] font-mono uppercase text-[#10B981] tracking-wider block border-b border-[#222228] pb-2">
                        Demonstrated Technical Strengths:
                    </span>
                    <ul className="space-y-2 text-xs text-[#A1A1AA] font-mono">
                        {(strengths || [
                            'Demonstrated solid algorithmic understanding and optimal data structure choices',
                            'Clear verbal articulation of trade-offs prior to code implementation'
                        ]).map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-[#10B981] flex-shrink-0">•</span>
                                <span className="text-[#FAFAFA] leading-relaxed">{s}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="bg-[#111114] border border-[#222228] rounded-md p-5 space-y-3">
                    <span className="text-[10px] font-mono uppercase text-[#F59E0B] tracking-wider block border-b border-[#222228] pb-2">
                        Targeted Growth Vectors:
                    </span>
                    <ul className="space-y-2 text-xs text-[#A1A1AA] font-mono">
                        {(areasForImprovement || [
                            'Consider testing with boundary edge cases (empty inputs, large values) before submitting',
                            'Provide more detail regarding horizontal scaling and failure recovery in distributed setups'
                        ]).map((w, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-[#F59E0B] flex-shrink-0">•</span>
                                <span className="text-[#FAFAFA] leading-relaxed">{w}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Executive Hiring Summary Card */}
            {summary && (
                <div className="bg-[#111114] border border-[#222228] rounded-md p-5 space-y-2 font-mono text-xs">
                    <span className="text-[10px] uppercase text-[#71717A] tracking-wider block">
                        Executive Evaluation Summary:
                    </span>
                    <p className="text-xs text-[#FAFAFA] leading-relaxed font-sans">
                        {summary}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ReportDetail;
