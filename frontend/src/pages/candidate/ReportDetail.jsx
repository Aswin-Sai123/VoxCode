import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

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
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            case 'Hire':
                return 'bg-green-500/10 text-green-400 border-green-500/30';
            case 'Needs Improvement':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            case 'Reject':
                return 'bg-red-500/10 text-red-400 border-red-500/30';
            default:
                return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
                <div className="w-14 h-14 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-lg font-bold text-gray-200 mb-1">Generating Performance Evaluation...</h3>
                <p className="text-xs text-gray-400">Gemini is analyzing conversation depth, code correctness, and test outputs.</p>
            </div>
        );
    }

    if (error || !evaluation) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 text-white">
                <div className="bg-gray-900 border border-red-500/30 rounded-3xl p-8 max-w-md text-center">
                    <p className="text-red-400 font-bold text-lg mb-2">Report Not Found</p>
                    <p className="text-gray-400 text-sm mb-6">{error || 'Unable to retrieve evaluation report.'}</p>
                    <button
                        onClick={() => navigate('/candidate/reports')}
                        className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs"
                    >
                        Return to My Reports
                    </button>
                </div>
            </div>
        );
    }

    const { scores, verdict, summary, strengths, areasForImprovement, codeReview, testCaseResults } = evaluation;

    return (
        <div className="min-h-screen bg-gray-950 text-white py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Navigation Bar */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/candidate/reports')}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors font-mono"
                    >
                        <span>←</span> Back to All Reports
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl text-xs font-semibold text-gray-300 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        <span>🖨️</span> Print / Save PDF
                    </button>
                </div>

                {/* Hero Summary Card */}
                <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-primary-950/40 border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`px-3.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider shadow-sm ${getVerdictBadge(verdict)}`}>
                                    Hiring Verdict: {verdict}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                    Evaluated by Rohan (AI Senior Tech Lead)
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-black text-gray-100">
                                {evaluation.assessment?.roleTitle || 'Software Engineer'}
                            </h1>
                            <p className="text-sm text-gray-400 font-medium">
                                {evaluation.assessment?.companyName || 'Engineering Organization'} • {evaluation.candidate?.name || 'Candidate Evaluation'}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                                Assessment: {evaluation.assessment?.title || 'Technical Assessment'} • {new Date(evaluation.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>

                        {/* Overall Score Dial */}
                        <div className="flex flex-col items-center justify-center p-6 bg-[#0d1117] border border-[#30363d] rounded-2xl min-w-[140px] text-center shadow-inner">
                            <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                                {scores?.overall || 0}
                            </span>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                Overall Score
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono mt-0.5">out of 100</span>
                        </div>
                    </div>
                </div>

                {/* 4 Dimension Score Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: 'Conceptual Q&A', val: scores?.conceptual || 0, desc: 'Architecture & fundamentals' },
                        { title: 'Coding Correctness', val: scores?.coding || 0, desc: 'Algorithm & test cases' },
                        { title: 'Code Quality', val: scores?.codeQuality || 0, desc: 'Structure, style & Big-O' },
                        { title: 'Communication', val: scores?.communication || 0, desc: 'Clarity & explanation' }
                    ].map((metric, idx) => (
                        <div key={idx} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-300">{metric.title}</span>
                                <span className="text-sm font-black text-white">{metric.val}%</span>
                            </div>
                            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-emerald-400 rounded-full transition-all duration-1000"
                                    style={{ width: `${metric.val}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono">{metric.desc}</span>
                        </div>
                    ))}
                </div>

                {/* Executive Summary */}
                {summary && (
                    <div className="bg-gray-900/70 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-2">
                            <span>📋</span> Executive AI Review Summary
                        </h3>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                            {summary}
                        </p>
                    </div>
                )}

                {/* Strengths & Growth Areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
                            <span>✓</span> Key Strengths Demonstrated
                        </h3>
                        <ul className="space-y-3">
                            {(strengths && strengths.length ? strengths : ['Good understanding of core problem requirements.']).map((s, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Areas for Improvement */}
                    <div className="bg-amber-950/10 border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
                            <span>▲</span> Areas for Technical Growth
                        </h3>
                        <ul className="space-y-3">
                            {(areasForImprovement && areasForImprovement.length ? areasForImprovement : ['Proactively analyze boundary cases before writing code.']).map((a, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                                    <span className="text-amber-400 font-bold mt-0.5">•</span>
                                    <span>{a}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Code Review & Complexity Analysis */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800 gap-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary-400 flex items-center gap-2">
                            <span>💻</span> Algorithmic Code Review & Complexity
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="bg-[#161b22] border border-[#30363d] px-3 py-1 rounded-lg text-xs font-mono text-blue-400">
                                Time: {codeReview?.timeComplexity || 'O(n)'}
                            </span>
                            <span className="bg-[#161b22] border border-[#30363d] px-3 py-1 rounded-lg text-xs font-mono text-purple-400">
                                Space: {codeReview?.spaceComplexity || 'O(1)'}
                            </span>
                        </div>
                    </div>

                    {codeReview?.correctness && (
                        <div>
                            <span className="text-xs font-bold text-gray-400 block mb-1">Correctness Analysis:</span>
                            <p className="text-xs text-gray-300 leading-relaxed bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
                                {codeReview.correctness}
                            </p>
                        </div>
                    )}

                    {codeReview?.suggestions && codeReview.suggestions.length > 0 && (
                        <div>
                            <span className="text-xs font-bold text-gray-400 block mb-2">Code Improvement Recommendations:</span>
                            <div className="space-y-2">
                                {codeReview.suggestions.map((sug, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-gray-300 bg-[#161b22]/60 border border-[#30363d]/60 p-3 rounded-lg">
                                        <span className="text-primary-400 font-mono font-bold">{i + 1}.</span>
                                        <span>{sug}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Test Cases Results Breakdown */}
                {testCaseResults && testCaseResults.length > 0 && (
                    <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-primary-400 flex items-center gap-2">
                                <span>🧪</span> Automated Test Suite Results
                            </h3>
                            <span className="text-xs font-mono text-gray-400">
                                {testCaseResults.filter(t => t.passed).length} / {testCaseResults.length} passed
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {testCaseResults.map((tc, idx) => (
                                <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-2 text-xs font-mono">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-300">Test Case {idx + 1}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tc.passed ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {tc.passed ? '✓ PASSED' : '✕ FAILED'}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-400 space-y-1">
                                        <div><span className="text-gray-500">Input:</span> {tc.input}</div>
                                        <div><span className="text-gray-500">Expected:</span> <span className="text-blue-400">{tc.expectedOutput}</span></div>
                                        <div><span className="text-gray-500">Actual:</span> <span className={tc.passed ? 'text-green-400' : 'text-red-400'}>{tc.actualOutput}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recruiter / Decision Card (If present) */}
                {evaluation.recruiterDecision && evaluation.recruiterDecision !== 'PENDING' && (
                    <div className="bg-gradient-to-r from-purple-950/40 to-primary-950/40 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-2">
                            Recruiter Decision Status
                        </span>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                {evaluation.recruiterDecision.replace(/_/g, ' ')}
                            </span>
                            {evaluation.recruiterNotes && (
                                <span className="text-xs text-gray-300 font-medium">"{evaluation.recruiterNotes}"</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Back to Dashboard Footer */}
                <div className="pt-6 pb-12 text-center">
                    <button
                        onClick={() => navigate('/candidate/reports')}
                        className="px-8 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-900/30 transition-all hover:scale-105 active:scale-95"
                    >
                        Back to My Reports
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportDetail;
