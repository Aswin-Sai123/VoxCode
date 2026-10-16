import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    Terminal, 
    Copy, 
    Check, 
    Mail, 
    Search, 
    Filter, 
    ArrowUpDown, 
    ChevronLeft, 
    ExternalLink, 
    CheckCircle2, 
    AlertCircle, 
    Users, 
    Trophy,
    X,
    Send
} from 'lucide-react';

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

    const shortlistedCount = evaluations.filter(e => e.recruiterDecision === 'SHORTLISTED' || e.recruiterDecision === 'ADVANCED_TO_ROUND_2').length;
    const avgScore = evaluations.length
        ? Math.round(evaluations.reduce((acc, e) => acc + (e.scores?.overall || 0), 0) / evaluations.length)
        : 0;

    return (
        <div className="flex-1 bg-[#09090B] text-[#FAFAFA] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Header Telemetry */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#222228] gap-3">
                <div className="space-y-1">
                    <Link
                        to="/company/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Pipeline Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-[#FAFAFA] tracking-tight">
                            {assessment?.title || 'Assessment Leaderboard'}
                        </h1>
                        <span className="studio-badge bg-[#111114] text-[#A1A1AA] border-[#222228]">
                            CODE: {assessment?.assessmentCode}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                    <button
                        onClick={copyMagicLink}
                        className="studio-btn-secondary text-xs"
                        title="Copy direct candidate magic link"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Link Copied' : 'Magic Link'}</span>
                    </button>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="studio-btn-primary text-xs"
                    >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Invite Candidates</span>
                    </button>
                </div>
            </div>

            {/* Top 3-Column Connected Metric Bar */}
            <div className="border border-[#222228] bg-[#111114] rounded-md grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#222228] overflow-hidden font-mono">
                <div className="p-4 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#71717A] block">
                        Evaluated Candidates
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                            {evaluations.length}
                        </span>
                        <span className="text-[11px] text-[#52525B]">completed</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#71717A] block">
                        Shortlisted Talent
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-[#10B981] tabular-nums">
                            {shortlistedCount}
                        </span>
                        <span className="text-[11px] text-[#10B981]">ready for next stage</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#71717A] block">
                        Cohort Average Score
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                            {avgScore}%
                        </span>
                        <span className="text-[11px] text-[#52525B]">mean technical index</span>
                    </div>
                </div>
            </div>

            {/* Search & Filter Command Strip */}
            <div className="bg-[#111114] border border-[#222228] rounded-md p-3 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
                <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#52525B]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter by candidate name or email..."
                        className="studio-input pl-9 py-1.5"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <select
                        value={verdictFilter}
                        onChange={(e) => setVerdictFilter(e.target.value)}
                        className="studio-input py-1.5 w-auto"
                    >
                        <option value="ALL">All Verdicts</option>
                        <option value="Strong Hire">Strong Hire</option>
                        <option value="Hire">Hire</option>
                        <option value="Needs Improvement">Needs Improvement</option>
                        <option value="Reject">Reject</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="studio-input py-1.5 w-auto"
                    >
                        <option value="score">Sort by Score</option>
                        <option value="date">Sort by Date</option>
                        <option value="name">Sort by Name</option>
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-md text-xs font-mono text-[#F43F5E] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* High-Density Candidate Leaderboard Table */}
            <div className="border border-[#222228] bg-[#111114] rounded-md overflow-hidden font-mono text-xs">
                {loading ? (
                    <div className="p-12 flex items-center justify-center text-xs text-[#71717A] gap-2">
                        <div className="w-4 h-4 border-2 border-[#FAFAFA] border-t-transparent rounded-full animate-spin"></div>
                        <span>QUERYING CANDIDATE LEADERBOARD MATRIX...</span>
                    </div>
                ) : evaluations.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#222228] bg-[#09090B] text-[#52525B] text-[10px] uppercase">
                                    <th className="py-2.5 px-4 font-medium">Rank</th>
                                    <th className="py-2.5 px-4 font-medium">Candidate Identity</th>
                                    <th className="py-2.5 px-4 font-medium">Composite Score</th>
                                    <th className="py-2.5 px-4 font-medium">Rubric Dimensions</th>
                                    <th className="py-2.5 px-4 font-medium">Verdict</th>
                                    <th className="py-2.5 px-4 font-medium">Recruiter Decision</th>
                                    <th className="py-2.5 px-4 font-medium text-right">Dossier</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222228]">
                                {evaluations.map((ev, index) => {
                                    const rankNum = (index + 1).toString().padStart(2, '0');
                                    const candidateName = ev.candidate?.name || ev.candidateName || 'Candidate';
                                    const candidateEmail = ev.candidate?.email || ev.candidateEmail || 'N/A';
                                    const score = ev.scores?.overall || 0;

                                    return (
                                        <tr key={ev._id} className="hover:bg-[#18181C] transition-colors">
                                            <td className="py-3 px-4 font-semibold text-[#FAFAFA]">
                                                #{rankNum}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-sans font-medium text-[#FAFAFA]">
                                                    {candidateName}
                                                </div>
                                                <span className="text-[11px] text-[#52525B]">
                                                    {candidateEmail}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[#FAFAFA] tabular-nums text-sm">
                                                        {score}%
                                                    </span>
                                                    <div className="w-16 h-1 bg-[#09090B] rounded-full overflow-hidden border border-[#222228] hidden sm:block">
                                                        <div
                                                            style={{ width: `${score}%` }}
                                                            className={`h-full ${score >= 75 ? 'bg-[#10B981]' : score >= 50 ? 'bg-[#F59E0B]' : 'bg-[#F43F5E]'}`}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-[10px] text-[#71717A]">
                                                <div className="flex items-center gap-1.5">
                                                    <span>DSA: {ev.scores?.coding || 0}</span>
                                                    <span>•</span>
                                                    <span>ARCH: {ev.scores?.conceptual || 0}</span>
                                                    <span>•</span>
                                                    <span>COMM: {ev.scores?.communication || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`studio-badge ${getVerdictBadge(ev.verdict)}`}>
                                                    {ev.verdict || 'COMPLETED'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <select
                                                    value={ev.recruiterDecision || 'PENDING'}
                                                    onChange={(e) => handleDecisionChange(ev._id, e.target.value)}
                                                    className={`studio-badge text-xs py-1 px-2 font-mono ${
                                                        ev.recruiterDecision === 'SHORTLISTED' || ev.recruiterDecision === 'ADVANCED_TO_ROUND_2'
                                                            ? 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30'
                                                            : ev.recruiterDecision === 'REJECTED'
                                                                ? 'text-[#F43F5E] bg-[#F43F5E]/10 border-[#F43F5E]/30'
                                                                : 'text-[#A1A1AA] bg-[#09090B] border-[#222228]'
                                                    }`}
                                                >
                                                    <option value="PENDING">Pending Review</option>
                                                    <option value="SHORTLISTED">Shortlisted</option>
                                                    <option value="ADVANCED_TO_ROUND_2">Round 2 Advanced</option>
                                                    <option value="REJECTED">Archived / Rejected</option>
                                                </select>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Link
                                                    to={`/candidate/report/${ev.session?._id || ev.session}`}
                                                    className="studio-btn-secondary text-[11px] py-1"
                                                >
                                                    <span>View Dossier</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-10 text-center font-mono space-y-2">
                        <p className="text-xs text-[#71717A]">No candidates evaluated for this assessment yet.</p>
                        <p className="text-[11px] text-[#52525B]">Dispatch email invitations or share the magic link to populate the leaderboard.</p>
                    </div>
                )}
            </div>

            {/* Automated Email Invite Modal Drawer */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 bg-[#09090B]/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#111114] border border-[#222228] rounded-md max-w-lg w-full p-6 space-y-5 font-mono text-xs">
                        <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-[#10B981]" />
                                <span className="font-semibold uppercase text-[#FAFAFA]">
                                    Dispatch Candidate Email Invitations
                                </span>
                            </div>
                            <button
                                onClick={() => { setShowInviteModal(false); setInviteSuccessData(null); }}
                                className="text-[#71717A] hover:text-[#FAFAFA]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {inviteSuccessData ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded text-[#10B981] space-y-1">
                                    <p className="font-semibold">Invitations Dispatched Successfully</p>
                                    <p className="text-[11px] text-[#A1A1AA]">
                                        Sent to {inviteSuccessData.sentCount} candidate addresses.
                                    </p>
                                </div>

                                {inviteSuccessData.previewUrl && (
                                    <div className="p-3 bg-[#09090B] border border-[#222228] rounded space-y-1 text-[11px]">
                                        <span className="text-[#52525B] uppercase block">Ethereal Mail Preview URL:</span>
                                        <a
                                            href={inviteSuccessData.previewUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[#10B981] underline break-all flex items-center gap-1"
                                        >
                                            <span>Open Simulated Inbox Preview</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}

                                <button
                                    onClick={() => { setShowInviteModal(false); setInviteSuccessData(null); }}
                                    className="studio-btn-primary w-full py-2"
                                >
                                    Dismiss Modal
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSendInvites} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                        Candidate Emails (comma or newline separated):
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={inviteEmails}
                                        onChange={(e) => setInviteEmails(e.target.value)}
                                        placeholder="candidate1@example.com, candidate2@example.com"
                                        className="studio-input resize-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                        Custom Briefing Message (Optional):
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={inviteMessage}
                                        onChange={(e) => setInviteMessage(e.target.value)}
                                        placeholder="Please complete this 30-minute technical evaluation within 48 hours."
                                        className="studio-input resize-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="studio-btn-secondary text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviteLoading || !inviteEmails.trim()}
                                        className="studio-btn-primary text-xs"
                                    >
                                        {inviteLoading ? 'Dispatching...' : 'Send Invitations'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentResults;
