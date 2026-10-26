import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    Copy, 
    Check, 
    Mail, 
    Search, 
    ChevronLeft, 
    ExternalLink, 
    AlertCircle, 
    X,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '../../components/common/EmptyState';

const AssessmentResults = () => {
    const { id } = useParams();

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
                toast.success('Candidate decision updated');
            }
        } catch (err) {
            console.error('Failed to update recruiter decision', err);
            toast.error('Failed to update decision: ' + (err.response?.data?.message || err.message));
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
                toast.success('Assessment invitations sent successfully');
            }
        } catch (err) {
            console.error('Failed to send invites', err);
            toast.error('Failed to send invites: ' + (err.response?.data?.message || err.message));
        } finally {
            setInviteLoading(false);
        }
    };

    const copyMagicLink = () => {
        const link = `${window.location.origin}/candidate/assessment/${assessment?.assessmentCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Magic link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

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

    const shortlistedCount = evaluations.filter(e => e.recruiterDecision === 'SHORTLISTED' || e.recruiterDecision === 'ADVANCED_TO_ROUND_2').length;
    const avgScore = evaluations.length
        ? Math.round(evaluations.reduce((acc, e) => acc + (e.scores?.overall || 0), 0) / evaluations.length)
        : 0;

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#232330] gap-4">
                <div className="space-y-1">
                    <Link
                        to="/company/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back to dashboard</span>
                    </Link>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-semibold text-[#EDEDF0] tracking-tight">
                            {assessment?.title || 'Assessment Results'}
                        </h1>
                        <span className="code-chit">
                            {assessment?.assessmentCode}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={copyMagicLink}
                        className="studio-btn-secondary text-xs py-2 px-3.5"
                        title="Copy direct candidate link"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#8B8B9E]" />}
                        <span>{copied ? 'Link copied' : 'Copy link'}</span>
                    </button>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="btn-primary text-xs py-2 px-3.5"
                    >
                        <Mail className="w-4 h-4" />
                        <span>Invite candidates</span>
                    </button>
                </div>
            </div>

            {/* Stat Cards - 3 Column */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-5 light-catch">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8B9E] block">
                        Evaluated Candidates
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                            {evaluations.length}
                        </span>
                        <span className="text-xs text-[#555568]">completed</span>
                    </div>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl p-5 light-catch">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8B9E] block">
                        Shortlisted Candidates
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-emerald-400 tabular-nums tracking-tight">
                            {shortlistedCount}
                        </span>
                        <span className="text-xs text-emerald-400 font-medium">ready for round 2</span>
                    </div>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl p-5 light-catch">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8B9E] block">
                        Average Cohort Score
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                            {avgScore}%
                        </span>
                        <span className="text-xs text-[#555568]">composite</span>
                    </div>
                </div>
            </div>

            {/* Search & Filter Strip */}
            <div className="bg-[#141419] border border-[#232330] rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#555568]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                        className="studio-input pl-9 py-2"
                    />
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <select
                        value={verdictFilter}
                        onChange={(e) => setVerdictFilter(e.target.value)}
                        className="studio-input py-2 w-auto"
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
                        className="studio-input py-2 w-auto"
                    >
                        <option value="score">Sort by Score</option>
                        <option value="date">Sort by Date</option>
                        <option value="name">Sort by Name</option>
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Candidate Results Table */}
            <div className="bg-[#141419] border border-[#232330] rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 flex items-center justify-center text-sm text-[#8B8B9E] gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span>Loading candidate results...</span>
                    </div>
                ) : evaluations.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-[#232330] bg-[#0A0A0B]/60 text-[#8B8B9E] text-xs font-medium">
                                    <th className="py-3 px-5">Rank</th>
                                    <th className="py-3 px-5">Candidate</th>
                                    <th className="py-3 px-5">Score</th>
                                    <th className="py-3 px-5">Integrity</th>
                                    <th className="py-3 px-5">Rubric Summary</th>
                                    <th className="py-3 px-5">AI Verdict</th>
                                    <th className="py-3 px-5">Hiring Decision</th>
                                    <th className="py-3 px-5 text-right">Report</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#232330]">
                                {evaluations.map((ev, index) => {
                                    const candidateName = ev.candidate?.name || ev.candidateName || 'Candidate';
                                    const candidateEmail = ev.candidate?.email || ev.candidateEmail || 'N/A';
                                    const score = ev.scores?.overall || 0;
                                    const integrity = ev.proctoringSummary?.integrityScore ?? 100;

                                    return (
                                        <tr key={ev._id} className="hover:bg-[#1C1C24]/60 transition-colors">
                                            <td className="py-4 px-5 font-semibold text-[#8B8B9E] text-xs">
                                                #{index + 1}
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="font-medium text-[#EDEDF0]">
                                                    {candidateName}
                                                </div>
                                                <span className="text-xs text-[#555568]">
                                                    {candidateEmail}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[#EDEDF0] tabular-nums text-sm">
                                                        {score}%
                                                    </span>
                                                    <div className="w-16 h-1.5 bg-[#0A0A0B] rounded-full overflow-hidden border border-[#232330] hidden sm:block">
                                                        <div
                                                             style={{ width: `${score}%` }}
                                                            className={`h-full ${score >= 75 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                                    integrity >= 90
                                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                        : integrity >= 75
                                                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                                            : 'text-red-400 bg-red-500/10 border-red-500/20'
                                                }`}>
                                                    <span>{integrity}% Trust</span>
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-xs text-[#8B8B9E]">
                                                <div className="flex items-center gap-1.5">
                                                    <span>Coding: {ev.scores?.coding || 0}</span>
                                                    <span className="text-[#363645]">•</span>
                                                    <span>Concept: {ev.scores?.conceptual || 0}</span>
                                                    <span className="text-[#363645]">•</span>
                                                    <span>Comm: {ev.scores?.communication || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVerdictBadge(ev.verdict)}`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                    <span>{ev.verdict || 'Completed'}</span>
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <select
                                                    value={ev.recruiterDecision || 'PENDING'}
                                                    onChange={(e) => handleDecisionChange(ev._id, e.target.value)}
                                                    className="bg-[#0A0A0B] border border-[#232330] text-xs text-[#EDEDF0] rounded-md px-2.5 py-1 focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="PENDING">Pending Review</option>
                                                    <option value="SHORTLISTED">Shortlisted</option>
                                                    <option value="ADVANCED_TO_ROUND_2">Round 2</option>
                                                    <option value="REJECTED">Archived</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                <Link
                                                    to={`/candidate/report/${ev.session?._id || ev.session}`}
                                                    className="studio-btn-secondary text-xs py-1.5 px-3"
                                                >
                                                    <span>View details</span>
                                                    <ExternalLink className="w-3.5 h-3.5 text-[#8B8B9E]" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        title="No candidates evaluated yet"
                        description="Send invitations to candidates or share the assessment magic link above."
                        actionLabel="Invite Candidates"
                        onAction={() => setShowInviteModal(true)}
                        actionIcon={Mail}
                    />
                )}
            </div>

            {/* Email Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#141419] border border-[#232330] rounded-xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#232330] pb-3">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-400" />
                                <h3 className="text-sm font-semibold text-[#EDEDF0]">
                                    Invite Candidates
                                </h3>
                            </div>
                            <button
                                onClick={() => { setShowInviteModal(false); setInviteSuccessData(null); }}
                                className="text-[#8B8B9E] hover:text-[#EDEDF0]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {inviteSuccessData ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 space-y-1">
                                    <p className="font-semibold text-sm">Invitations Sent Successfully</p>
                                    <p className="text-xs text-[#8B8B9E]">
                                        Sent to {inviteSuccessData.sentCount} candidate addresses.
                                    </p>
                                </div>

                                {inviteSuccessData.previewUrl && (
                                    <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg space-y-1 text-xs">
                                        <span className="text-[#8B8B9E] block">Ethereal Inbox Preview:</span>
                                        <a
                                            href={inviteSuccessData.previewUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-400 underline break-all flex items-center gap-1 hover:text-blue-300"
                                        >
                                            <span>Open Simulated Inbox Preview</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                )}

                                <button
                                    onClick={() => { setShowInviteModal(false); setInviteSuccessData(null); }}
                                    className="btn-primary w-full py-2.5 text-xs font-medium"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSendInvites} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[#8B8B9E] block">
                                        Candidate Emails (comma or line separated):
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
                                    <label className="text-xs font-medium text-[#8B8B9E] block">
                                        Custom Message (Optional):
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={inviteMessage}
                                        onChange={(e) => setInviteMessage(e.target.value)}
                                        placeholder="Please complete this technical assessment within 48 hours."
                                        className="studio-input resize-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2.5 pt-2">
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
                                        className="btn-primary text-xs"
                                    >
                                        {inviteLoading ? 'Sending...' : 'Send Invitations'}
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
