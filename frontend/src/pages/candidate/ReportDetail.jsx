import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    ChevronLeft, 
    Printer, 
    CheckCircle2, 
    AlertCircle, 
    Code2, 
    Cpu, 
    ShieldCheck
} from 'lucide-react';

import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';

const ReportDetail = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [evaluation, setEvaluation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            case 'Hire':
                return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'Needs Improvement':
                return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'Reject':
                return 'text-red-400 bg-red-500/10 border-red-500/20';
            default:
                return 'text-[#8B8B9E] bg-[#141419] border-[#232330]';
        }
    };

    if (loading) {
        return (
            <div className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
                <CardSkeleton className="h-8 w-40" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <CardSkeleton className="lg:col-span-5 h-64" />
                    <CardSkeleton className="lg:col-span-7 h-64" />
                </div>
                <CardSkeleton className="h-44" />
                <TableSkeleton rows={3} />
            </div>
        );
    }

    if (error || !evaluation) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#141419] border border-red-500/20 rounded-xl p-8 space-y-4 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                    <div>
                        <h2 className="text-sm font-semibold text-[#EDEDF0]">Report not found</h2>
                        <p className="text-xs text-[#8B8B9E] mt-1">{error || 'Unable to retrieve report records for this session.'}</p>
                    </div>
                    <button
                        onClick={() => navigate('/candidate/reports')}
                        className="studio-btn-secondary w-full py-2.5 text-xs font-medium"
                    >
                        Return to reports
                    </button>
                </div>
            </div>
        );
    }

    const { scores, verdict, summary, strengths, areasForImprovement, codeReview, testCaseResults } = evaluation;

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
            {/* Navigation and Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-[#232330]">
                <Link
                    to="/candidate/reports"
                    className="inline-flex items-center gap-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to reports</span>
                </Link>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-[#8B8B9E] font-mono bg-[#141419] px-2.5 py-1 rounded-md border border-[#232330]">
                        ID: {sessionId?.slice(-8)}
                    </span>
                    <button
                        onClick={() => window.print()}
                        className="studio-btn-secondary text-xs py-1.5 px-3"
                        title="Print report"
                    >
                        <Printer className="w-3.5 h-3.5 text-[#8B8B9E]" />
                        <span>Print</span>
                    </button>
                </div>
            </div>

            {/* Header Card: Composite Score & Category Progress */}
            <div className="bg-[#141419] border border-[#232330] rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#232330]">
                {/* Composite Score (5 Cols) */}
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVerdictBadge(verdict)}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                <span>{verdict || 'Evaluated'}</span>
                            </span>
                        </div>
                        <h1 className="text-xl font-semibold text-[#EDEDF0] tracking-tight">
                            Overall Assessment Score
                        </h1>
                        <p className="text-xs text-[#8B8B9E] leading-relaxed">
                            Composite evaluation across coding correctness, code cleanliness, conceptual depth, and communication.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl sm:text-6xl font-bold text-[#EDEDF0] tabular-nums tracking-tight">
                                {scores?.overall || 0}
                            </span>
                            <span className="text-lg text-[#555568]">/ 100</span>
                        </div>
                        <span className="text-xs text-emerald-400 font-medium block">
                            Evaluated against objective hiring rubrics
                        </span>
                    </div>
                </div>

                {/* Rubric Progress Bars (7 Cols) */}
                <div className="lg:col-span-7 p-6 sm:p-8 space-y-5 text-xs">
                    <span className="text-xs font-medium text-[#EDEDF0] block border-b border-[#232330] pb-2">
                        Evaluation Breakdown
                    </span>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-[#8B8B9E]">Coding & Problem Solving</span>
                                <span className="text-[#EDEDF0] font-semibold tabular-nums">{scores?.coding || 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-[#0A0A0B] rounded-full overflow-hidden border border-[#232330]">
                                <div style={{ width: `${scores?.coding || 0}%` }} className="h-full bg-blue-500 rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-[#8B8B9E]">Code Quality & Architecture</span>
                                <span className="text-[#EDEDF0] font-semibold tabular-nums">{scores?.codeQuality || 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-[#0A0A0B] rounded-full overflow-hidden border border-[#232330]">
                                <div style={{ width: `${scores?.codeQuality || 0}%` }} className="h-full bg-blue-500 rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-[#8B8B9E]">Conceptual Understanding</span>
                                <span className="text-[#EDEDF0] font-semibold tabular-nums">{scores?.conceptual || 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-[#0A0A0B] rounded-full overflow-hidden border border-[#232330]">
                                <div style={{ width: `${scores?.conceptual || 0}%` }} className="h-full bg-blue-500 rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-[#8B8B9E]">Verbal Communication</span>
                                <span className="text-[#EDEDF0] font-semibold tabular-nums">{scores?.communication || 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-[#0A0A0B] rounded-full overflow-hidden border border-[#232330]">
                                <div style={{ width: `${scores?.communication || 0}%` }} className="h-full bg-blue-500 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Integrity & Proctoring Audit Card */}
            {evaluation?.proctoringSummary && (
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232330] pb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-[#EDEDF0] flex items-center gap-2">
                                    <span>Session Reliability & Environment</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                        evaluation.proctoringSummary.integrityScore >= 90
                                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                            : evaluation.proctoringSummary.integrityScore >= 75
                                                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                                : 'text-red-400 bg-red-500/10 border-red-500/20'
                                    }`}>
                                        {evaluation.proctoringSummary.trustLevel?.replace('_', ' ') || 'OPTIMAL'}
                                    </span>
                                </h2>
                                <p className="text-xs text-[#8B8B9E]">
                                    Session connectivity, workspace focus, and environment continuity telemetry.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1.5 self-start sm:self-center">
                            <span className="text-2xl font-bold text-[#EDEDF0] tabular-nums">
                                {evaluation.proctoringSummary.integrityScore ?? 100}%
                            </span>
                            <span className="text-xs text-[#8B8B9E]">Stability Index</span>
                        </div>
                    </div>

                    {/* Metric Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">Tab Switches</span>
                            <span className={`text-base font-semibold tabular-nums mt-0.5 block ${
                                (evaluation.proctoringSummary.tabSwitchCount || 0) > 0 ? 'text-amber-400' : 'text-[#EDEDF0]'
                            }`}>
                                {evaluation.proctoringSummary.tabSwitchCount || 0}
                            </span>
                        </div>

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">Window Blurs</span>
                            <span className={`text-base font-semibold tabular-nums mt-0.5 block ${
                                (evaluation.proctoringSummary.windowBlurCount || 0) > 0 ? 'text-amber-400' : 'text-[#EDEDF0]'
                            }`}>
                                {evaluation.proctoringSummary.windowBlurCount || 0}
                            </span>
                        </div>

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">Face Missing</span>
                            <span className={`text-base font-semibold tabular-nums mt-0.5 block ${
                                (evaluation.proctoringSummary.faceMissingCount || 0) > 0 ? 'text-red-400' : 'text-[#EDEDF0]'
                            }`}>
                                {evaluation.proctoringSummary.faceMissingCount || 0}
                            </span>
                        </div>

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">Multiple Faces</span>
                            <span className={`text-base font-semibold tabular-nums mt-0.5 block ${
                                (evaluation.proctoringSummary.multipleFacesCount || 0) > 0 ? 'text-red-400' : 'text-[#EDEDF0]'
                            }`}>
                                {evaluation.proctoringSummary.multipleFacesCount || 0}
                            </span>
                        </div>

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">Large Pastes</span>
                            <span className={`text-base font-semibold tabular-nums mt-0.5 block ${
                                (evaluation.proctoringSummary.pasteCount || 0) > 0 ? 'text-red-400' : 'text-[#EDEDF0]'
                            }`}>
                                {evaluation.proctoringSummary.pasteCount || 0}
                            </span>
                        </div>

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">Fullscrn Exits</span>
                            <span className={`text-base font-semibold tabular-nums mt-0.5 block ${
                                (evaluation.proctoringSummary.fullscreenExitCount || 0) > 0 ? 'text-amber-400' : 'text-[#EDEDF0]'
                            }`}>
                                {evaluation.proctoringSummary.fullscreenExitCount || 0}
                            </span>
                        </div>
                    </div>

                    {/* Event Log (if any) */}
                    {evaluation.proctoringSummary.events && evaluation.proctoringSummary.events.length > 0 && (
                        <div className="pt-2 space-y-2">
                            <span className="text-[11px] font-semibold text-[#8B8B9E] uppercase tracking-wider block">
                                Session Event Timeline
                            </span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {evaluation.proctoringSummary.events.map((evt, idx) => (
                                    <div key={idx} className="p-2 bg-[#0A0A0B] border border-[#232330] rounded flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            <span className="font-medium text-[#EDEDF0]">{evt.type?.replace('_', ' ')}</span>
                                            <span className="text-[#8B8B9E] text-[11px]">• {evt.details}</span>
                                        </div>
                                        <span className="text-[10px] text-[#555568] font-mono">
                                            {new Date(evt.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Algorithmic Complexity & Test Suite Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                {/* Big-O Complexity */}
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#232330] pb-3">
                        <span className="text-xs font-semibold text-[#EDEDF0] flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-blue-400" />
                            Algorithmic Complexity
                        </span>
                        <span className="text-xs text-[#555568]">Static Analysis</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-[#0A0A0B] border border-[#232330] rounded-lg space-y-1">
                            <span className="text-xs text-[#8B8B9E] block">Time Complexity</span>
                            <span className="text-sm font-semibold text-[#EDEDF0] font-mono">
                                {codeReview?.timeComplexity || 'N/A'}
                            </span>
                        </div>
                        <div className="p-3.5 bg-[#0A0A0B] border border-[#232330] rounded-lg space-y-1">
                            <span className="text-xs text-[#8B8B9E] block">Space Complexity</span>
                            <span className="text-sm font-semibold text-[#EDEDF0] font-mono">
                                {codeReview?.spaceComplexity || 'N/A'}
                            </span>
                        </div>
                    </div>

                    {codeReview?.correctness && (
                        <p className="text-xs text-[#8B8B9E] leading-relaxed pt-1">
                            {codeReview.correctness}
                        </p>
                    )}
                    {codeReview?.comments && (
                        <p className="text-xs text-[#8B8B9E] leading-relaxed">
                            {codeReview.comments}
                        </p>
                    )}
                </div>

                {/* Test Cases Results */}
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#232330] pb-3">
                        <span className="text-xs font-semibold text-[#EDEDF0] flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Test Suite Results
                        </span>
                        <span className="text-xs text-emerald-400 font-medium">
                            {testCaseResults && testCaseResults.length > 0 
                                ? `${testCaseResults.filter(t => t.passed).length} of ${testCaseResults.length} passed`
                                : 'Discussion Round'}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {testCaseResults && testCaseResults.length > 0 ? (
                            testCaseResults.map((tc, idx) => (
                                <div key={idx} className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-2 h-2 rounded-full ${tc.passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                        <span className="text-[#EDEDF0] font-medium">Test case #{idx + 1}</span>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${tc.passed ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                                        {tc.passed ? `Passed (${tc.executionTime || '0.05s'})` : 'Failed'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 bg-[#0A0A0B] border border-[#232330] rounded-lg text-center space-y-1">
                                <p className="text-xs text-[#8B8B9E]">
                                    No automated code execution was required for this interview.
                                </p>
                                <p className="text-[11px] text-[#555568]">
                                    Evaluation was based on technical depth, architecture, and live discussion.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Submitted Code Solution */}
            {evaluation.codeSubmission?.code && (
                <div className="bg-[#141419] border border-[#232330] rounded-xl overflow-hidden text-xs">
                    <div className="h-10 border-b border-[#232330] bg-[#0A0A0B] px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-medium text-[#EDEDF0]">
                                Submitted Solution
                            </span>
                            <span className="text-xs text-[#8B8B9E] uppercase font-mono">
                                ({evaluation.codeSubmission.language || 'javascript'})
                            </span>
                        </div>
                    </div>
                    <pre className="p-4 bg-[#0A0A0B] overflow-x-auto text-[#EDEDF0] text-xs leading-relaxed font-mono">
                        {evaluation.codeSubmission.code}
                    </pre>
                </div>
            )}

            {/* Strengths & Areas for Improvement */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-3">
                    <span className="text-xs font-semibold text-emerald-400 block border-b border-[#232330] pb-2">
                        Key Strengths
                    </span>
                    <ul className="space-y-2 text-xs text-[#8B8B9E]">
                        {strengths && strengths.length > 0 ? (
                            strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="text-emerald-400 flex-shrink-0 font-bold">•</span>
                                    <span className="text-[#EDEDF0] leading-relaxed">{s}</span>
                                </li>
                            ))
                        ) : (
                            <li className="text-xs text-[#8B8B9E]">Completed the interview session.</li>
                        )}
                    </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-3">
                    <span className="text-xs font-semibold text-amber-400 block border-b border-[#232330] pb-2">
                        Areas for Improvement
                    </span>
                    <ul className="space-y-2 text-xs text-[#8B8B9E]">
                        {areasForImprovement && areasForImprovement.length > 0 ? (
                            areasForImprovement.map((w, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="text-amber-400 flex-shrink-0 font-bold">•</span>
                                    <span className="text-[#EDEDF0] leading-relaxed">{w}</span>
                                </li>
                            ))
                        ) : (
                            <li className="text-xs text-[#8B8B9E]">Continue broadening systems and problem-solving depth.</li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Summary Card */}
            {summary && (
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-2 text-xs">
                    <span className="text-xs font-semibold text-[#EDEDF0] block">
                        Executive Summary
                    </span>
                    <p className="text-xs text-[#8B8B9E] leading-relaxed">
                        {summary}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ReportDetail;
