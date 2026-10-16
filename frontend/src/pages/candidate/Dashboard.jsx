import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

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

    const handleJoin = (e) => {
        if (e) e.preventDefault();
        const code = assessmentCode.trim().toUpperCase();
        if (!code) {
            setJoinError('Please enter an assessment code');
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
        if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
        return 'text-red-400 border-red-500/40 bg-red-950/20';
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
        <div className="min-h-screen bg-gray-950 text-white py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* 1. Header & Welcome Bar */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-800 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Candidate Portal</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
                            Welcome back, {user?.name || 'Candidate'}!
                        </h1>
                        <p className="mt-1 text-sm text-gray-400">
                            Enter your assessment code to start your live AI technical interview with Rohan, or review your performance history.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/candidate/reports')}
                            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl text-xs font-bold text-gray-200 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <span>📊</span>
                            <span>My Reports ({recentReports.length})</span>
                        </button>
                    </div>
                </div>

                {/* 2. Ongoing Session Resume Alert (if any) */}
                {inProgressSessions.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-950/40 to-yellow-950/20 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-amber-950/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg flex-shrink-0">
                                ⏳
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-amber-300">
                                    You have an active interview session in progress!
                                </h3>
                                <p className="text-xs text-gray-400">
                                    {inProgressSessions[0]?.assessment?.title || 'Technical Assessment'} • {inProgressSessions[0]?.assessment?.roleTitle || 'Developer'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/candidate/interview/${inProgressSessions[0]?.assessment?.assessmentCode}`)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0"
                        >
                            <span>Resume Interview</span>
                            <span>→</span>
                        </button>
                    </div>
                )}

                {/* 3. Performance Metrics Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase mb-2">
                            <span>Completed Interviews</span>
                            <span>🎯</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white">
                            {loading ? '...' : stats.totalInterviews}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Evaluated by AI interviewer</p>
                    </div>

                    <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase mb-2">
                            <span>Average Score</span>
                            <span>⚡</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-primary-400">
                            {loading ? '...' : stats.avgScore ? `${stats.avgScore}%` : 'N/A'}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Across 4 dimensions</p>
                    </div>

                    <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase mb-2">
                            <span>Highest Score</span>
                            <span>🏆</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                            {loading ? '...' : stats.highestScore ? `${stats.highestScore}/100` : 'N/A'}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Personal best evaluation</p>
                    </div>

                    <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase mb-2">
                            <span>Top Verdict</span>
                            <span>🌟</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-extrabold text-purple-300 truncate">
                            {loading ? '...' : stats.bestVerdict}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">AI hiring recommendation</p>
                    </div>
                </div>

                {/* 4. The Assessment Entry Launchpad (Hero Card) */}
                <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-[#131822] to-gray-900 border border-primary-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="max-w-2xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 border border-primary-500/30 rounded-full text-xs font-bold text-primary-300 mb-4">
                            <span>🎙️ Powered by Rohan • Adaptive Voice AI</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                            Enter Technical Assessment
                        </h2>
                        <p className="text-gray-400 text-sm mb-6 max-w-lg mx-auto">
                            Enter the unique 14-character assessment code provided by your recruiter to unlock the 2-stage voice Q&A and coding workspace.
                        </p>

                        <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
                            <input
                                type="text"
                                value={assessmentCode}
                                onChange={(e) => {
                                    setAssessmentCode(e.target.value.toUpperCase());
                                    setJoinError('');
                                }}
                                placeholder="ASMT-XXXX-XXXX"
                                className="flex-1 bg-gray-950/80 border border-gray-700 focus:border-primary-500 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-gray-600 focus:outline-none transition-all shadow-inner"
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 flex-shrink-0 active:scale-95"
                            >
                                <span>Join Lobby</span>
                                <span>→</span>
                            </button>
                        </form>

                        {joinError && (
                            <p className="text-xs text-red-400 mb-4 font-semibold">{joinError}</p>
                        )}

                        {/* Available Active Assessments quick-test list */}
                        {availableAssessments.length > 0 && (
                            <div className="pt-4 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-400">
                                <span className="font-semibold text-gray-500">Quick Test Assessment:</span>
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    {availableAssessments.map((asm) => (
                                        <button
                                            key={asm._id}
                                            onClick={() => handleQuickFill(asm.assessmentCode)}
                                            className="px-2.5 py-1 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 rounded-lg text-primary-300 font-mono text-[11px] transition-colors"
                                            title={`Click to auto-enter ${asm.title} (${asm.companyName})`}
                                        >
                                            {asm.assessmentCode} ({asm.roleTitle})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Recent Performance & Reports Showcase */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span>📈</span>
                                <span>Recent Interview Performance</span>
                            </h2>
                            <p className="text-xs text-gray-400">Your latest AI technical evaluations and hiring verdicts</p>
                        </div>
                        {recentReports.length > 0 && (
                            <button
                                onClick={() => navigate('/candidate/reports')}
                                className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                            >
                                View all ({recentReports.length}) →
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse">
                            Loading your performance history...
                        </div>
                    ) : recentReports.length === 0 ? (
                        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 text-center space-y-3">
                            <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center mx-auto text-xl text-gray-400">
                                📋
                            </div>
                            <h3 className="text-sm font-bold text-gray-200">No Interview Reports Yet</h3>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                Once you complete your first AI technical interview, your detailed scorecard, code analysis, and hiring verdict will appear right here.
                            </p>
                            {availableAssessments.length > 0 && (
                                <button
                                    onClick={() => handleQuickFill(availableAssessments[0].assessmentCode)}
                                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 font-bold text-xs text-white rounded-xl transition-all shadow-md shadow-primary-600/20"
                                >
                                    Take Demo Assessment Now
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {recentReports.map((report) => (
                                <div
                                    key={report._id}
                                    onClick={() => navigate(`/candidate/report/${report.session?._id || report.session}`)}
                                    className="bg-gray-900/80 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <span className="text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                                                {report.assessment?.companyName || 'Technical Assessment'}
                                            </span>
                                            <h3 className="text-base font-bold text-white group-hover:text-primary-300 transition-colors">
                                                {report.assessment?.roleTitle || report.assessment?.title || 'Software Engineer'}
                                            </h3>
                                            <span className="text-[11px] text-gray-500">
                                                Completed: {new Date(report.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${getScoreColor(report.scores?.overall || 0)}`}>
                                                {report.scores?.overall || 0}%
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getVerdictBadge(report.verdict)}`}>
                                                {report.verdict}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 4 Dimension mini-scores */}
                                    <div className="grid grid-cols-4 gap-1.5 py-2.5 px-3 bg-gray-950/60 rounded-xl border border-gray-800/80 text-center mb-3">
                                        <div>
                                            <p className="text-[9px] text-gray-500 uppercase">Concept</p>
                                            <p className="text-xs font-bold text-gray-300">{report.scores?.conceptual || 0}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-500 uppercase">Coding</p>
                                            <p className="text-xs font-bold text-gray-300">{report.scores?.coding || 0}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-500 uppercase">Quality</p>
                                            <p className="text-xs font-bold text-gray-300">{report.scores?.codeQuality || 0}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-500 uppercase">Comm</p>
                                            <p className="text-xs font-bold text-gray-300">{report.scores?.communication || 0}%</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-400 group-hover:text-primary-400 transition-colors pt-1">
                                        <span className="text-[11px] text-gray-500">
                                            {report.testCaseResults?.length || 0} Test Cases Executed
                                        </span>
                                        <span className="font-semibold flex items-center gap-1">
                                            <span>View Report Card</span>
                                            <span>→</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 6. Interview Preparation & Tips */}
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <span>💡</span>
                        <span>Interview Best Practices with Rohan</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400 mt-4">
                        <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800/60">
                            <span className="font-bold text-gray-200 block mb-1">🗣️ Speak Your Thoughts</span>
                            <p>Explain your architectural logic out loud before diving into writing code. Rohan grades communication & clarity.</p>
                        </div>
                        <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800/60">
                            <span className="font-bold text-gray-200 block mb-1">🧪 Run & Validate Code</span>
                            <p>Use the built-in "Run Code" dock to execute against test cases and observe runtime and memory complexity.</p>
                        </div>
                        <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800/60">
                            <span className="font-bold text-gray-200 block mb-1">📊 Immediate AI Feedback</span>
                            <p>Submitting the interview unlocks your personal performance scorecard, code review, and hiring verdict instantly.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
