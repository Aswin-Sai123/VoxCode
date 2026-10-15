import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const Reports = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await api.get('/evaluation/my-reports');
                if (res.data.success) {
                    setReports(res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to load reports', err);
                setError('Could not retrieve evaluation reports. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

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

    const getScoreColor = (score) => {
        if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
        if (score >= 70) return 'text-green-400 border-green-500/40 bg-green-950/20';
        if (score >= 55) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
        return 'text-red-400 border-red-500/40 bg-red-950/20';
    };

    const avgScore = reports.length
        ? Math.round(reports.reduce((acc, r) => acc + (r.scores?.overall || 0), 0) / reports.length)
        : 0;

    return (
        <div className="min-h-screen bg-gray-950 text-white py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-8 border-b border-gray-800 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
                            My Interview Performance Reports
                        </h1>
                        <p className="mt-1 text-sm text-gray-400">
                            Detailed AI scoring, technical code reviews, and constructive feedback from your interviews.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="self-start sm:self-auto px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 transition-all shadow-sm"
                    >
                        ← Candidate Dashboard
                    </button>
                </div>

                {/* Stat Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
                    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Completed Interviews
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{reports.length}</span>
                            <span className="text-xs text-gray-500">evaluations generated</span>
                        </div>
                    </div>

                    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Average Performance Score
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${avgScore >= 75 ? 'text-green-400' : 'text-amber-400'}`}>
                                {avgScore > 0 ? `${avgScore}%` : 'N/A'}
                            </span>
                            <span className="text-xs text-gray-500">across all dimensions</span>
                        </div>
                    </div>

                    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            AI Evaluator
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-sm font-bold text-gray-200">Gemini 2.5 Flash Engine</span>
                        </div>
                    </div>
                </div>

                {/* Loading / Error States */}
                {loading && (
                    <div className="py-20 text-center">
                        <div className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm text-gray-400 font-medium">Loading your performance reports...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center my-6">
                        <p className="text-sm font-semibold">{error}</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && reports.length === 0 && (
                    <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-12 text-center my-8 max-w-xl mx-auto shadow-2xl">
                        <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-200 mb-1">No Evaluation Reports Yet</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Once you finish an AI interview session, your full scorecard, code review, and hiring verdict will appear right here.
                        </p>
                        <button
                            onClick={() => navigate('/candidate/dashboard')}
                            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-600/30 transition-all"
                        >
                            Enter an Assessment ID
                        </button>
                    </div>
                )}

                {/* Reports List */}
                {!loading && reports.length > 0 && (
                    <div className="space-y-6">
                        {reports.map((report) => (
                            <div
                                key={report._id}
                                className="bg-gray-900/90 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 sm:p-8 transition-all shadow-xl hover:shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getVerdictBadge(report.verdict)}`}>
                                            {report.verdict || 'Evaluated'}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono">
                                            {new Date(report.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono">
                                            Stage: {report.session?.stage || 'COMPLETED'}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-gray-100 mb-1">
                                            {report.assessment?.roleTitle || 'Software Engineer'}
                                        </h3>
                                        <p className="text-xs text-gray-400 font-medium">
                                            {report.assessment?.companyName || 'Engineering Organization'} • {report.assessment?.title || 'Technical Assessment'}
                                        </p>
                                    </div>

                                    {/* Score Pills Breakdown */}
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                        <div className="bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded text-xs">
                                            <span className="text-gray-400 text-[11px] mr-1.5">Conceptual:</span>
                                            <span className="font-bold text-gray-200">{report.scores?.conceptual || 0}%</span>
                                        </div>
                                        <div className="bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded text-xs">
                                            <span className="text-gray-400 text-[11px] mr-1.5">Coding:</span>
                                            <span className="font-bold text-gray-200">{report.scores?.coding || 0}%</span>
                                        </div>
                                        <div className="bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded text-xs">
                                            <span className="text-gray-400 text-[11px] mr-1.5">Code Quality:</span>
                                            <span className="font-bold text-gray-200">{report.scores?.codeQuality || 0}%</span>
                                        </div>
                                        <div className="bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded text-xs">
                                            <span className="text-gray-400 text-[11px] mr-1.5">Communication:</span>
                                            <span className="font-bold text-gray-200">{report.scores?.communication || 0}%</span>
                                        </div>
                                    </div>

                                    {/* Brief Summary Snippet */}
                                    {report.summary && (
                                        <p className="text-xs text-gray-400 line-clamp-2 pt-1 leading-relaxed">
                                            {report.summary}
                                        </p>
                                    )}
                                </div>

                                {/* Right Side: Overall Score Badge & Button */}
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-800">
                                    <div className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center ${getScoreColor(report.scores?.overall || 0)}`}>
                                        <span className="text-2xl font-black">{report.scores?.overall || 0}</span>
                                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Overall</span>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/candidate/report/${report.session?._id || report.session}`)}
                                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-primary-900/30 flex items-center gap-1.5 hover:scale-105 active:scale-95"
                                    >
                                        <span>View Full Report Card</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
