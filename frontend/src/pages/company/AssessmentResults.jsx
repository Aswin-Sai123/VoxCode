import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AssessmentResults = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState(null);
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [verdictFilter, setVerdictFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('score');

    // Email Invite State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteMessage, setInviteMessage] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteSuccessData, setInviteSuccessData] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // Fetch assessment details and candidate evaluations in parallel
                const [asmRes, evalRes] = await Promise.all([
                    api.get(`/assessments/${id}`),
                    api.get(`/evaluation/assessment/${id}?verdict=${verdictFilter}&sortBy=${sortBy}&search=${searchQuery}`)
                ]);

                if (asmRes.data.success) setAssessment(asmRes.data.data);
                if (evalRes.data.success) setEvaluations(evalRes.data.data || []);
            } catch (err) {
                console.error('Failed to load assessment results', err);
                setError('Could not retrieve candidate evaluations.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchResults();
    }, [id, verdictFilter, sortBy, searchQuery]);

    const handleDecisionChange = async (evaluationId, newDecision) => {
        try {
            const res = await api.patch(`/evaluation/${evaluationId}/decision`, {
                recruiterDecision: newDecision
            });
            if (res.data.success) {
                setEvaluations(prev =>
                    prev.map(ev => (ev._id === evaluationId ? { ...ev, recruiterDecision: newDecision } : ev))
                );
            }
        } catch (err) {
            console.error('Failed to update recruiter decision', err);
            alert('Failed to update decision: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSendInvites = async (e) => {
        if (e) e.preventDefault();
        if (!inviteEmails.trim()) return;
        setInviteLoading(true);
        try {
            const res = await api.post(`/assessments/${id}/invite`, {
                emails: inviteEmails,
                customMessage: inviteMessage
            });
            if (res.data.success) {
                setInviteSuccessData(res.data.data);
                setInviteEmails('');
            }
        } catch (err) {
            console.error('Failed to send invites', err);
            alert('Failed to send invites: ' + (err.response?.data?.message || err.message));
        } finally {
            setInviteLoading(false);
        }
    };

    const copyMagicLink = () => {
        const link = `${window.location.origin}/candidate/assessment/${assessment?.assessmentCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

    const getScoreBadge = (score) => {
        if (score >= 85) return 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30';
        if (score >= 70) return 'text-green-400 bg-green-950/30 border-green-500/30';
        if (score >= 55) return 'text-amber-400 bg-amber-950/30 border-amber-500/30';
        return 'text-red-400 bg-red-950/30 border-red-500/30';
    };

    const shortlistedCount = evaluations.filter(e => e.recruiterDecision === 'SHORTLISTED' || e.recruiterDecision === 'ADVANCED_TO_ROUND_2').length;
    const avgScore = evaluations.length
        ? Math.round(evaluations.reduce((acc, e) => acc + (e.scores?.overall || 0), 0) / evaluations.length)
        : 0;

    return (
        <div className="min-h-screen bg-gray-950 text-white py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Navigation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                        onClick={() => navigate('/company/dashboard')}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors font-mono"
                    >
                        <span>←</span> Back to Company Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setInviteSuccessData(null);
                                setShowInviteModal(true);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-primary-600/30 flex items-center gap-1.5 active:scale-95"
                        >
                            <span>📧</span>
                            <span>Invite Candidates</span>
                        </button>
                        <span className="text-xs text-gray-400 font-mono bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-xl">
                            Code: {assessment?.assessmentCode || 'ASMT-CODE'}
                        </span>
                    </div>
                </div>

                {/* Hero Assessment Overview Card */}
                <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950/30 border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest block">
                                Candidate Evaluation Leaderboard
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-100">
                                {assessment?.title || 'Technical Assessment'}
                            </h1>
                            <p className="text-sm text-gray-400">
                                Role: {assessment?.role?.title || 'Software Engineer'} • {assessment?.experienceLevel} Level • {assessment?.durationMinutes} Mins
                            </p>
                        </div>

                        {/* Top KPI Badges */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="bg-[#161b22] border border-[#30363d] px-5 py-3 rounded-2xl text-center">
                                <span className="text-2xl font-black text-white block">{evaluations.length}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Candidates Evaluated</span>
                            </div>
                            <div className="bg-[#161b22] border border-[#30363d] px-5 py-3 rounded-2xl text-center">
                                <span className="text-2xl font-black text-emerald-400 block">{shortlistedCount}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shortlisted</span>
                            </div>
                            <div className="bg-[#161b22] border border-[#30363d] px-5 py-3 rounded-2xl text-center">
                                <span className="text-2xl font-black text-blue-400 block">{avgScore > 0 ? `${avgScore}%` : 'N/A'}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Score</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="w-full md:w-80">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search candidate name or email..."
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500 font-mono"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                        {/* Filter by Verdict */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono">Verdict:</span>
                            <select
                                value={verdictFilter}
                                onChange={(e) => setVerdictFilter(e.target.value)}
                                className="bg-[#161b22] border border-[#30363d] text-xs font-bold text-gray-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary-500"
                            >
                                <option value="ALL">All Verdicts</option>
                                <option value="Strong Hire">Strong Hire</option>
                                <option value="Hire">Hire</option>
                                <option value="Needs Improvement">Needs Improvement</option>
                                <option value="Reject">Reject</option>
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono">Sort:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-[#161b22] border border-[#30363d] text-xs font-bold text-gray-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary-500"
                            >
                                <option value="score">Highest Score</option>
                                <option value="date">Most Recent</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="py-20 text-center">
                        <div className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm text-gray-400 font-medium">Fetching candidate reports...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
                        <p className="text-sm font-semibold">{error}</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && evaluations.length === 0 && (
                    <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl">
                        <div className="w-14 h-14 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-gray-200 mb-1">No Candidate Evaluations Yet</h3>
                        <p className="text-xs text-gray-400 mb-6">
                            Candidates who complete this assessment will be graded automatically by Gemini and listed here on the leaderboard.
                        </p>
                        <span className="text-xs font-mono text-gray-500 bg-[#161b22] px-3 py-1.5 rounded-lg border border-[#30363d]">
                            Invite Code: {assessment?.assessmentCode}
                        </span>
                    </div>
                )}

                {/* Candidate Leaderboard Table */}
                {!loading && evaluations.length > 0 && (
                    <div className="bg-gray-900/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#161b22] border-b border-[#30363d] text-gray-400 font-mono uppercase tracking-wider">
                                    <tr>
                                        <th className="py-4 px-6">Candidate</th>
                                        <th className="py-4 px-4 text-center">Overall Score</th>
                                        <th className="py-4 px-4">Dimension Breakdown</th>
                                        <th className="py-4 px-4 text-center">AI Verdict</th>
                                        <th className="py-4 px-4">Recruiter Decision</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 font-sans">
                                    {evaluations.map((ev, index) => (
                                        <tr key={ev._id} className="hover:bg-gray-800/40 transition-colors">
                                            {/* Candidate Info */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary-950 border border-primary-500/30 flex items-center justify-center font-bold text-xs text-primary-300">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-100 text-sm">
                                                            {ev.candidate?.name || 'Candidate'}
                                                        </div>
                                                        <div className="text-gray-500 font-mono text-[11px]">
                                                            {ev.candidate?.email || 'guest@candidate.com'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Overall Score */}
                                            <td className="py-4 px-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-xl text-sm font-black border ${getScoreBadge(ev.scores?.overall || 0)}`}>
                                                    {ev.scores?.overall || 0}%
                                                </span>
                                            </td>

                                            {/* Dimension Breakdown Pills */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
                                                    <span className="bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded text-gray-300">
                                                        Q&A: {ev.scores?.conceptual || 0}%
                                                    </span>
                                                    <span className="bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded text-gray-300">
                                                        Code: {ev.scores?.coding || 0}%
                                                    </span>
                                                    <span className="bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded text-gray-300">
                                                        Quality: {ev.scores?.codeQuality || 0}%
                                                    </span>
                                                    <span className="bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded text-gray-300">
                                                        Comm: {ev.scores?.communication || 0}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* AI Verdict */}
                                            <td className="py-4 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getVerdictBadge(ev.verdict)}`}>
                                                    {ev.verdict || 'Evaluated'}
                                                </span>
                                            </td>

                                            {/* Recruiter Decision Select */}
                                            <td className="py-4 px-4">
                                                <select
                                                    value={ev.recruiterDecision || 'PENDING'}
                                                    onChange={(e) => handleDecisionChange(ev._id, e.target.value)}
                                                    className="bg-[#161b22] border border-[#30363d] text-xs font-bold text-gray-200 px-2.5 py-1 rounded-lg focus:outline-none focus:border-primary-500"
                                                >
                                                    <option value="PENDING">Pending Review</option>
                                                    <option value="SHORTLISTED">⭐ Shortlisted</option>
                                                    <option value="ADVANCED_TO_ROUND_2">🚀 Next Round</option>
                                                    <option value="REJECTED">✕ Rejected</option>
                                                </select>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => navigate(`/candidate/report/${ev.session?._id || ev.session}`)}
                                                    className="px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-sm"
                                                >
                                                    View Report Card →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 7. Invite Candidates Modal */}
                {showInviteModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="absolute top-5 right-5 text-gray-400 hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>

                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">📧</span>
                                <h2 className="text-xl font-bold text-white">Invite Candidates</h2>
                            </div>
                            <p className="text-xs text-gray-400 mb-5">
                                Send automated email invitations with personalized assessment links for <strong>{assessment?.title}</strong>.
                            </p>

                            {/* Magic Link Box */}
                            <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 mb-5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Direct Magic Link
                                </span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/candidate/assessment/${assessment?.assessmentCode}`}
                                        className="flex-1 bg-transparent border-0 text-xs text-primary-300 font-mono focus:outline-none truncate"
                                    />
                                    <button
                                        type="button"
                                        onClick={copyMagicLink}
                                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                                    >
                                        {copied ? '✓ Copied' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSendInvites} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                        Candidate Email Address(es)
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={inviteEmails}
                                        onChange={(e) => setInviteEmails(e.target.value)}
                                        placeholder="sarah@example.com, alex@example.com"
                                        className="w-full bg-gray-950 border border-gray-800 focus:border-primary-500 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-600 focus:outline-none font-mono"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">Separate multiple emails with commas or newlines</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                        Optional Note to Candidates
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteMessage}
                                        onChange={(e) => setInviteMessage(e.target.value)}
                                        placeholder="e.g. Please complete this technical interview by Friday."
                                        className="w-full bg-gray-950 border border-gray-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
                                    />
                                </div>

                                {inviteSuccessData && (
                                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 space-y-1">
                                        <p className="font-bold">✓ Successfully dispatched {inviteSuccessData.invitations?.length} invitation(s)!</p>
                                        {inviteSuccessData.invitations?.[0]?.previewUrl && (
                                            <a
                                                href={inviteSuccessData.invitations[0].previewUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="underline text-[11px] text-emerald-400 block"
                                            >
                                                View Ethereal Email Preview ↗
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviteLoading || !inviteEmails.trim()}
                                        className="px-5 py-2 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-primary-600/30 disabled:opacity-50"
                                    >
                                        {inviteLoading ? 'Sending Invites...' : 'Send Invitations 🚀'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssessmentResults;
