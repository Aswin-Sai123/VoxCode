import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { FileText, ArrowRight, ExternalLink, Activity, ChevronLeft, AlertCircle, Clock } from 'lucide-react';

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
                setError('Could not retrieve evaluation dossiers.');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

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

    const avgScore = reports.length
        ? Math.round(reports.reduce((acc, r) => acc + (r.scores?.overall || 0), 0) / reports.length)
        : 0;

    const highestScore = reports.length
        ? Math.max(...reports.map(r => r.scores?.overall || 0))
        : 0;

    return (
        <div className="flex-1 bg-[#09090B] text-[#FAFAFA] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Header Telemetry */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#222228] gap-3">
                <div className="space-y-1">
                    <Link
                        to="/candidate/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Command Center</span>
                    </Link>
                    <h1 className="text-lg font-semibold text-[#FAFAFA] tracking-tight">
                        Evaluation Dossiers Ledger
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <span className="studio-badge bg-[#111114] text-[#A1A1AA] border-[#222228]">
                        LEDGER // VERIFIED RECORDS
                    </span>
                </div>
            </div>

            {/* Stat Overview Strip: 3-Column Connected Metric Bar */}
            <div className="border border-[#222228] bg-[#111114] rounded-md grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#222228] overflow-hidden">
                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Evaluated Sessions
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {reports.length}
                        </span>
                        <span className="text-[11px] font-mono text-[#52525B]">dossiers</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Composite Average
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {avgScore}%
                        </span>
                        <span className="text-[11px] font-mono text-[#10B981]">overall</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Peak Assessment Score
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {highestScore}%
                        </span>
                        <span className="text-[11px] font-mono text-[#71717A]">maximum</span>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-md text-xs font-mono text-[#F43F5E] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Ledger Table */}
            <div className="border border-[#222228] bg-[#111114] rounded-md overflow-hidden">
                {loading ? (
                    <div className="p-12 flex items-center justify-center font-mono text-xs text-[#71717A] gap-2">
                        <div className="w-4 h-4 border-2 border-[#FAFAFA] border-t-transparent rounded-full animate-spin"></div>
                        <span>QUERYING PERFORMANCE LEDGER...</span>
                    </div>
                ) : reports.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs font-mono">
                            <thead>
                                <tr className="border-b border-[#222228] bg-[#09090B] text-[#52525B] text-[10px] uppercase">
                                    <th className="py-2.5 px-4 font-medium">Session & Role</th>
                                    <th className="py-2.5 px-4 font-medium">Organization</th>
                                    <th className="py-2.5 px-4 font-medium">Timestamp</th>
                                    <th className="py-2.5 px-4 font-medium">Composite Score</th>
                                    <th className="py-2.5 px-4 font-medium">Rubric Breakdown</th>
                                    <th className="py-2.5 px-4 font-medium">Verdict</th>
                                    <th className="py-2.5 px-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222228]">
                                {reports.map((report) => (
                                    <tr key={report._id} className="hover:bg-[#18181C] transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-sans font-medium text-[#FAFAFA]">
                                                {report.assessmentTitle || 'Technical Interview'}
                                            </div>
                                            <span className="text-[10px] text-[#52525B]">
                                                SESSION // {report.session?._id?.slice(-8) || report.session?.slice(-8)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-[#A1A1AA]">
                                            {report.companyName || 'Hiring Entity'}
                                        </td>
                                        <td className="py-3 px-4 text-[#71717A] tabular-nums">
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm font-semibold text-[#FAFAFA] tabular-nums">
                                                {report.scores?.overall || 0}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 text-[10px] text-[#71717A]">
                                                <span>DSA: {report.scores?.coding || 0}</span>
                                                <span>•</span>
                                                <span>ARCH: {report.scores?.conceptual || 0}</span>
                                                <span>•</span>
                                                <span>COMM: {report.scores?.communication || 0}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`studio-badge ${getVerdictBadge(report.verdict)}`}>
                                                {report.verdict || 'COMPLETED'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Link
                                                to={`/candidate/report/${report.session?._id || report.session}`}
                                                className="studio-btn-secondary text-[11px] py-1"
                                            >
                                                <span>View Dossier</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-10 text-center font-mono space-y-2">
                        <p className="text-xs text-[#71717A]">No evaluation records found in ledger.</p>
                        <p className="text-[11px] text-[#52525B]">Complete an interview session to review performance telemetry.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
