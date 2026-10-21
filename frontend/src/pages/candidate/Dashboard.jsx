import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { 
    Terminal, 
    ArrowRight, 
    Play, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Layers, 
    FileText, 
    Cpu, 
    ExternalLink,
    Activity,
    ChevronRight
} from 'lucide-react';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [assessmentCode, setAssessmentCode] = useState('');
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joinError, setJoinError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await api.get('/candidate/dashboard');
                if (res.data.success) {
                    setDashboardData(res.data.data);
                }
            } catch (err) {
                console.error('Failed to load candidate dashboard', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const [startingPractice, setStartingPractice] = useState(false);

    const handleStartPractice = async () => {
        setStartingPractice(true);
        setJoinError('');
        try {
            const res = await api.post('/interview/practice/start');
            if (res.data.success) {
                navigate('/candidate/interview/PRACTICE-MOCK-SESSION');
            }
        } catch (err) {
            setJoinError(err.response?.data?.message || 'Failed to start practice mock session');
        } finally {
            setStartingPractice(false);
        }
    };

    const handleJoin = (e) => {
        if (e) e.preventDefault();
        const code = assessmentCode.trim().toUpperCase();
        if (!code) {
            setJoinError('Please specify a valid assessment code (e.g. ASMT-XXXX-XXXX)');
            return;
        }
        setJoinError('');
        navigate(`/candidate/assessment/${code}`);
    };

    const handleQuickFill = (code) => {
        setAssessmentCode(code);
        setJoinError('');
        navigate(`/candidate/assessment/${code}`);
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

    const stats = dashboardData?.stats || {
        totalInterviews: 0,
        avgScore: 0,
        highestScore: 0,
        bestVerdict: 'N/A'
    };

    const recentReports = dashboardData?.recentReports || [];
    const inProgressSessions = dashboardData?.inProgressSessions || [];
    const availableAssessments = dashboardData?.availableAssessments || [];

    return (
        <div className="flex-1 bg-[#09090B] text-[#FAFAFA] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Header Telemetry Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#222228] gap-3">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        <span className="font-mono text-[11px] text-[#A1A1AA] uppercase tracking-wider">
                            Candidate dashboard
                        </span>
                    </div>
                    <h1 className="text-lg font-semibold text-[#FAFAFA] tracking-tight">
                        {user?.name || 'Engineer'}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleStartPractice}
                        disabled={startingPractice}
                        className="studio-btn-primary bg-[#10B981] hover:bg-[#059669] text-[#09090B] font-semibold text-xs flex items-center gap-1.5"
                    >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{startingPractice ? 'Starting...' : 'Practice interview'}</span>
                    </button>
                    <Link to="/candidate/reports" className="studio-btn-secondary">
                        <FileText className="w-3.5 h-3.5" />
                        <span>My reports</span>
                    </Link>
                </div>
            </div>

            {/* In-Progress Session Resume Banner (if any) */}
            {inProgressSessions.length > 0 && (
                <div className="bg-[#111114] border border-[#F59E0B]/40 rounded-md p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping flex-shrink-0"></span>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-mono font-medium text-[#FAFAFA]">
                                    Interview in progress: {inProgressSessions[0].assessmentTitle || 'Interview'}
                                </p>
                                {inProgressSessions[0].isPractice && (
                                    <span className="studio-badge bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 text-[10px]">
                                        Practice
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] font-mono text-[#71717A]">
                                Code: {inProgressSessions[0].assessmentCode} • Step: {inProgressSessions[0].stage}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/candidate/interview/${inProgressSessions[0].assessmentCode}`)}
                        className="studio-btn-primary bg-[#F59E0B] text-[#09090B] hover:bg-[#D97706] text-xs font-semibold"
                    >
                        <span>Continue interview</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Top Telemetry Strip: 4-Column Connected Metric Bar */}
            <div className="border border-[#222228] bg-[#111114] rounded-md grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#222228] overflow-hidden">
                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Interviews done
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {stats.totalInterviews}
                        </span>
                        <span className="text-[11px] font-mono text-[#52525B]">sessions</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Average score
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {stats.avgScore}%
                        </span>
                        <span className="text-[11px] font-mono text-[#10B981]">overall</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Best score
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {stats.highestScore}%
                        </span>
                        <span className="text-[11px] font-mono text-[#71717A]">max</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Code runners
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-mono font-medium text-[#10B981]">
                            Ready
                        </span>
                        <span className="text-[10px] font-mono text-[#52525B]">0.18s</span>
                    </div>
                </div>
            </div>

            {/* Quick Assessment Launchpad Console */}
            <div className="bg-[#111114] border border-[#222228] rounded-md p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#FAFAFA]" />
                        <span className="text-xs font-mono font-semibold uppercase text-[#FAFAFA]">
                            Join with code
                        </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#52525B]">Enter code from recruiter</span>
                </div>

                <form onSubmit={handleJoin} className="flex flex-col sm:flex-row items-center gap-2.5">
                    <div className="relative flex-1 w-full">
                        <input
                            type="text"
                            value={assessmentCode}
                            onChange={(e) => {
                                setAssessmentCode(e.target.value.toUpperCase());
                                if (joinError) setJoinError('');
                            }}
                            placeholder="ENTER ASSESSMENT CODE (E.G. ASMT-4400-5665)"
                            className="studio-input font-mono uppercase tracking-wider text-xs"
                        />
                    </div>
                    <button
                        type="submit"
                        className="studio-btn-primary w-full sm:w-auto px-5 py-2 font-mono text-xs whitespace-nowrap"
                    >
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </form>

                {joinError && (
                    <p className="text-xs font-mono text-[#F43F5E] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{joinError}</span>
                    </p>
                )}
            </div>

            {/* Active Assessment Queue: Linear-Style Structured Table */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#71717A]" />
                        <h2 className="text-xs font-mono font-semibold uppercase text-[#A1A1AA] tracking-wider">
                            Open assessments
                        </h2>
                    </div>
                    <span className="text-[11px] font-mono text-[#52525B]">
                        {availableAssessments.length} available
                    </span>
                </div>

                <div className="border border-[#222228] bg-[#111114] rounded-md overflow-hidden">
                    {availableAssessments.length > 0 ? (
                        <div className="divide-y divide-[#222228]">
                            {availableAssessments.map((asmt) => (
                                <div
                                    key={asmt._id}
                                    className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#18181C] transition-colors"
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-xs font-semibold text-[#FAFAFA] truncate">
                                                {asmt.title || asmt.role?.title || 'Technical Specialist'}
                                            </span>
                                            <span className="studio-badge bg-[#09090B] text-[#A1A1AA] border-[#222228]">
                                                {asmt.company?.name || asmt.companyName || 'Hiring Team'}
                                            </span>
                                            <span className="studio-badge bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25">
                                                [OPEN]
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[11px] font-mono text-[#71717A] flex-wrap">
                                            <span className="text-[#A1A1AA]">CODE: {asmt.assessmentCode}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{asmt.durationMinutes || 30}m Limit</span>
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <span>Skills: {(asmt.skills || ['JavaScript', 'DSA']).slice(0, 3).join(', ')}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleQuickFill(asmt.assessmentCode)}
                                            className="studio-btn-primary font-mono text-xs"
                                        >
                                            <span>Start</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center space-y-2 font-mono">
                            <p className="text-xs text-[#71717A]">No active assessment invitations currently assigned.</p>
                            <p className="text-[11px] text-[#52525B]">Enter an assessment code provided by your recruiter above to begin.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Evaluations Ledger: High-Density Structured Table */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#71717A]" />
                        <h2 className="text-xs font-mono font-semibold uppercase text-[#A1A1AA] tracking-wider">
                            Recent reports
                        </h2>
                    </div>
                    <Link to="/candidate/reports" className="text-[11px] font-mono text-[#A1A1AA] hover:text-[#FAFAFA] flex items-center gap-1">
                        <span>View all</span>
                        <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>

                <div className="border border-[#222228] bg-[#111114] rounded-md overflow-hidden">
                    {recentReports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs font-mono">
                                <thead>
                                    <tr className="border-b border-[#222228] bg-[#09090B] text-[#52525B] text-[10px] uppercase">
                                        <th className="py-2.5 px-4 font-medium">Session ID / Role</th>
                                        <th className="py-2.5 px-4 font-medium">Date</th>
                                        <th className="py-2.5 px-4 font-medium">Composite Score</th>
                                        <th className="py-2.5 px-4 font-medium">Verdict</th>
                                        <th className="py-2.5 px-4 font-medium text-right">Report</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#222228] text-xs">
                                    {recentReports.map((report) => (
                                        <tr key={report._id} className="hover:bg-[#18181C] transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-sans font-medium text-[#FAFAFA]">
                                                    {report.assessmentTitle || 'Technical Assessment'}
                                                </div>
                                                <span className="text-[10px] text-[#52525B]">
                                                    {report.companyName}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-[#71717A] tabular-nums">
                                                {new Date(report.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-[#FAFAFA] tabular-nums">
                                                    {report.scores?.overall || 0}%
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`studio-badge ${getVerdictBadge(report.verdict)}`}>
                                                    {report.verdict || 'Completed'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Link
                                                    to={`/candidate/report/${report.session?._id || report.session}`}
                                                    className="studio-btn-secondary text-[11px] py-1"
                                                >
                                                    <span>View report</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center space-y-1 font-mono">
                            <p className="text-xs text-[#71717A]">No evaluation records yet.</p>
                            <p className="text-[11px] text-[#52525B]">Complete an assessment to generate your first technical evaluation dossier.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
