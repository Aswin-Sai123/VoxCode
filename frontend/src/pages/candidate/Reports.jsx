import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ExternalLink, ChevronLeft, AlertCircle, Search } from 'lucide-react';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';

const Reports = () => {
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
                setError('Could not retrieve evaluation reports.');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

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

    // Candidate scores for mock practice assessments
    const mockReports = reports.filter(r => r.assessment?.assessmentType === 'MOCK' || !r.assessment?.assessmentType);

    const avgScore = mockReports.length
        ? Math.round(mockReports.reduce((acc, r) => acc + (r.scores?.overall || 0), 0) / mockReports.length)
        : 0;

    const highestScore = mockReports.length
        ? Math.max(...mockReports.map(r => r.scores?.overall || 0))
        : 0;

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#232330] gap-4">
                <div className="space-y-1">
                    <Link
                        to="/candidate/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors active:scale-[0.98]"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back to dashboard</span>
                    </Link>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#EDEDF0] metallic-heading tracking-tight">
                        Interview Reports
                    </h1>
                    <p className="text-sm text-[#8B8B9E]">
                        Review detailed scorecards and feedback for your practice interview sessions. Official company interviews are delivered directly to employer recruiters.
                    </p>
                </div>
            </div>

            {/* Stat Overview Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading ? (
                    <>
                        <CardSkeleton className="h-24" />
                        <CardSkeleton className="h-24" />
                        <CardSkeleton className="h-24" />
                    </>
                ) : (
                    <>
                        <div className="bg-[#141419] border border-[#232330] rounded-xl p-5 light-catch">
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8B9E] block">
                                Completed Interviews
                            </span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                                    {reports.length}
                                </span>
                                <span className="text-xs text-[#555568]">total sessions</span>
                            </div>
                        </div>

                        <div className="bg-[#141419] border border-[#232330] rounded-xl p-5 light-catch">
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8B9E] block">
                                Mock Average Score
                            </span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                                    {avgScore}%
                                </span>
                                <span className="text-xs text-emerald-400 font-medium">composite</span>
                            </div>
                        </div>

                        <div className="bg-[#141419] border border-[#232330] rounded-xl p-5 light-catch">
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8B9E] block">
                                Top Mock Performance
                            </span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                                    {highestScore}%
                                </span>
                                <span className="text-xs text-[#555568]">best score</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Reports Table */}
            <div className="bg-[#141419] border border-[#232330] rounded-xl overflow-hidden light-catch">
                {loading ? (
                    <TableSkeleton rows={5} />
                ) : reports.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-[#232330] bg-[#0A0A0B]/60 text-[#8B8B9E] text-xs font-medium">
                                    <th className="py-3 px-5">Assessment</th>
                                    <th className="py-3 px-5">Type</th>
                                    <th className="py-3 px-5">Organization</th>
                                    <th className="py-3 px-5">Date</th>
                                    <th className="py-3 px-5">Score</th>
                                    <th className="py-3 px-5">Verdict / Status</th>
                                    <th className="py-3 px-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#232330]">
                                {reports.map((report) => {
                                    const asmt = report.assessment || {};
                                    const isMock = asmt.assessmentType === 'MOCK';
                                    const companyName = asmt.targetCompanyName || asmt.companyName || 'Company';

                                    return (
                                        <tr key={report._id} className="hover:bg-[#1C1C24]/60 transition-colors">
                                            <td className="py-4 px-5">
                                                <div className="font-medium text-[#EDEDF0]">
                                                    {asmt.title || 'Technical Interview'}
                                                </div>
                                                <span className="text-xs font-mono text-[#555568]">
                                                    ID: {report.session?._id?.slice(-8) || report.session?.slice(-8)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                {isMock ? (
                                                    <span className="dual-tone-pill text-blue-400 bg-blue-500/10 border-blue-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                        <span>Mock Practice</span>
                                                    </span>
                                                ) : (
                                                    <span className="dual-tone-pill text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                        <span>Official Test</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5 text-xs text-[#8B8B9E]">
                                                {companyName}
                                            </td>
                                            <td className="py-4 px-5 text-xs text-[#8B8B9E] tabular-nums font-mono">
                                                {new Date(report.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-5">
                                                {isMock ? (
                                                    <span className="font-semibold text-[#EDEDF0] tabular-nums">
                                                        {report.scores?.overall || 0}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-[#8B8B9E] italic">
                                                        Confidential
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5">
                                                {isMock ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVerdictBadge(report.verdict)}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        <span>{report.verdict || 'Completed'}</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        <span>Submitted to Recruiter</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                {isMock ? (
                                                    <Link
                                                        to={`/candidate/report/${report.session?._id || report.session}`}
                                                        className="studio-btn-secondary text-xs py-1.5 px-3 active:scale-[0.98] transition-transform"
                                                    >
                                                        <span>View report</span>
                                                        <ExternalLink className="w-3.5 h-3.5 text-[#8B8B9E]" />
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-[#555568]">
                                                        Recruiter Only
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        title="No evaluation reports found"
                        description="Complete a mock interview practice session to generate your comprehensive performance report."
                        actionLabel="Go to Dashboard"
                        onAction={() => window.location.href = '/candidate/dashboard'}
                        actionIcon={Search}
                    />
                )}
            </div>
        </div>
    );
};

export default Reports;
