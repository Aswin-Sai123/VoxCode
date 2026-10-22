import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { 
    Plus, 
    Copy, 
    Check, 
    Trash2, 
    Pause, 
    Play, 
    Layers, 
    ChevronRight,
    AlertCircle,
    Loader2,
    Activity,
    Edit3,
    FileText,
    Sparkles,
    RefreshCw,
    CheckCircle2
} from 'lucide-react';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    const [roles, setRoles] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [interviews, setInterviews] = useState({ ongoing: [], completed: [] });
    const [loadingAssessments, setLoadingAssessments] = useState(true);
    const [loadingInterviews, setLoadingInterviews] = useState(true);

    // role form state
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [roleTitle, setRoleTitle] = useState('');
    const [roleDesc, setRoleDesc] = useState('');
    const [roleError, setRoleError] = useState('');
    const [copiedCode, setCopiedCode] = useState(null);

    // role editing state
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [editRoleTitle, setEditRoleTitle] = useState('');
    const [editRoleDesc, setEditRoleDesc] = useState('');

    // report generation state
    const [generatingReportId, setGeneratingReportId] = useState(null);

    // fetch interviews telemetry
    const fetchInterviews = async (showLoading = false) => {
        if (showLoading) setLoadingInterviews(true);
        try {
            const res = await api.get('/company/interviews');
            if (res.data.success) {
                setInterviews(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch company interviews', err);
        } finally {
            setLoadingInterviews(false);
        }
    };

    useEffect(() => {
        let isCancelled = false;
        const initDashboardData = async () => {
            try {
                const [rolesRes, asmtRes, intRes] = await Promise.allSettled([
                    api.get('/company/roles'),
                    api.get('/assessments'),
                    api.get('/company/interviews')
                ]);
                if (isCancelled) return;
                if (rolesRes.status === 'fulfilled' && rolesRes.value?.data?.success) {
                    setRoles(rolesRes.value.data.data);
                }
                if (asmtRes.status === 'fulfilled' && asmtRes.value?.data?.success) {
                    setAssessments(asmtRes.value.data.data);
                }
                if (intRes.status === 'fulfilled' && intRes.value?.data?.success) {
                    setInterviews(intRes.value.data.data);
                }
            } finally {
                if (!isCancelled) {
                    setLoadingAssessments(false);
                    setLoadingInterviews(false);
                }
            }
        };
        initDashboardData();
        return () => { isCancelled = true; };
    }, []);

    // create role
    const handleCreateRole = async (e) => {
        e.preventDefault();
        setRoleError('');
        if (!roleTitle.trim()) {
            setRoleError('Role title is required');
            return;
        }
        try {
            const res = await api.post('/company/roles', {
                title: roleTitle.trim(),
                description: roleDesc.trim()
            });
            if (res.data.success) {
                setRoles([...roles, res.data.data]);
                setRoleTitle('');
                setRoleDesc('');
                setShowRoleForm(false);
            }
        } catch (err) {
            setRoleError(err.response?.data?.message || 'Failed to create role');
        }
    };

    // update role
    const handleUpdateRole = async (e) => {
        e.preventDefault();
        if (!editRoleTitle.trim()) return;
        try {
            const res = await api.put(`/company/roles/${editingRoleId}`, {
                title: editRoleTitle.trim(),
                description: editRoleDesc.trim()
            });
            if (res.data.success) {
                setRoles(roles.map(r => r._id === editingRoleId ? res.data.data : r));
                setEditingRoleId(null);
                setEditRoleTitle('');
                setEditRoleDesc('');
            }
        } catch (err) {
            console.error('Failed to update role', err);
            alert(err.response?.data?.message || 'Failed to update role');
        }
    };

    const startEditRole = (role) => {
        setEditingRoleId(role._id);
        setEditRoleTitle(role.title);
        setEditRoleDesc(role.description || '');
    };

    // delete role
    const handleDeleteRole = async (roleId) => {
        if (!window.confirm('Delete this role?')) return;
        try {
            await api.delete(`/company/roles/${roleId}`);
            setRoles(roles.filter(r => r._id !== roleId));
        } catch (err) {
            console.error('Failed to delete role', err);
        }
    };

    // toggle assessment status
    const handleToggleStatus = async (assessmentId) => {
        try {
            const res = await api.patch(`/assessments/${assessmentId}/status`);
            if (res.data.success) {
                setAssessments(assessments.map(a =>
                    a._id === assessmentId ? { ...a, status: res.data.data.status } : a
                ));
            }
        } catch (err) {
            console.error('Failed to toggle status', err);
        }
    };

    // trigger report generation manually
    const handleTriggerEvaluation = async (sessionId) => {
        setGeneratingReportId(sessionId);
        try {
            const res = await api.post(`/evaluation/trigger/${sessionId}`);
            if (res.data.success) {
                await fetchInterviews();
            }
        } catch (err) {
            console.error('Failed to trigger evaluation', err);
            alert(err.response?.data?.message || 'Failed to generate evaluation report');
        } finally {
            setGeneratingReportId(null);
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const activeCount = assessments.filter(a => a.status === 'ACTIVE').length;

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#232330] gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-[#EDEDF0] tracking-tight">
                        Recruiter Dashboard
                    </h1>
                    <p className="text-sm text-[#8B8B9E] mt-1">
                        Manage your assessments and track candidate progress for {user?.name || 'your company'}.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowRoleForm(!showRoleForm)}
                        className="studio-btn-secondary"
                    >
                        <span>{showRoleForm ? 'Cancel' : '+ New Job Role'}</span>
                    </button>
                    <Link
                        to="/company/create-assessment"
                        className="btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Assessment</span>
                    </Link>
                </div>
            </div>

            {/* Stat Cards - 4 Column */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
                        Active Assessments
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                            {activeCount}
                        </span>
                        <span className="text-xs text-emerald-400 font-medium">live</span>
                    </div>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl p-5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
                        Live Interviews
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-emerald-400 tabular-nums tracking-tight">
                            {interviews?.ongoing?.length || 0}
                        </span>
                        <span className="text-xs text-emerald-400 font-medium">taking test now</span>
                    </div>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl p-5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
                        Completed Sessions
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                            {interviews?.completed?.length || 0}
                        </span>
                        <span className="text-xs text-[#555568]">finished</span>
                    </div>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl p-5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
                        Configured Roles
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                            {roles.length}
                        </span>
                        <span className="text-xs text-[#555568]">roles</span>
                    </div>
                </div>
            </div>

            {/* Quick Role Profile Form Drawer */}
            {showRoleForm && (
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-4">
                    <div className="border-b border-[#232330] pb-3">
                        <h2 className="text-sm font-semibold text-[#EDEDF0]">
                            Create New Job Role Profile
                        </h2>
                        <p className="text-xs text-[#8B8B9E] mt-0.5">
                            Roles can be reused across multiple assessments.
                        </p>
                    </div>

                    {roleError && (
                        <p className="text-xs text-red-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{roleError}</span>
                        </p>
                    )}

                    <form onSubmit={handleCreateRole} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={roleTitle}
                                onChange={(e) => setRoleTitle(e.target.value)}
                                placeholder="Role title (e.g. Senior Frontend Engineer)"
                                className="studio-input"
                            />
                            <input
                                type="text"
                                value={roleDesc}
                                onChange={(e) => setRoleDesc(e.target.value)}
                                placeholder="Department or description (optional)"
                                className="studio-input"
                            />
                        </div>
                        <div className="flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowRoleForm(false)}
                                className="studio-btn-secondary text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary text-xs"
                            >
                                Save Role Profile
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Live Ongoing Interviews Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <h2 className="text-sm font-semibold text-[#EDEDF0]">
                            Live Interviews ({interviews.ongoing.length})
                        </h2>
                    </div>
                    <button
                        onClick={fetchInterviews}
                        disabled={loadingInterviews}
                        className="text-xs text-[#8B8B9E] hover:text-[#EDEDF0] flex items-center gap-1.5 transition-colors"
                        title="Refresh session list"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingInterviews ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>

                <div className="border border-[#232330] bg-[#141419] rounded-xl overflow-hidden">
                    {loadingInterviews ? (
                        <div className="p-8 flex items-center justify-center text-xs text-[#8B8B9E] gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span>Loading live sessions...</span>
                        </div>
                    ) : interviews.ongoing.length > 0 ? (
                        <div className="divide-y divide-[#232330]">
                            {interviews.ongoing.map((session) => (
                                <div
                                    key={session.sessionId}
                                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#1C1C24]/60 transition-colors"
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-[#EDEDF0]">
                                                {session.candidateName}
                                            </span>
                                            <span className="text-xs text-[#8B8B9E]">
                                                &lt;{session.candidateEmail}&gt;
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                                <span>Live: {session.currentStage?.replace('_', ' ')}</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-[#8B8B9E] flex-wrap">
                                            <span>Assessment: <strong className="text-[#EDEDF0]">{session.assessmentTitle}</strong></span>
                                            <span>•</span>
                                            <span>Code: <span className="font-mono text-[#EDEDF0]">{session.assessmentCode}</span></span>
                                            <span>•</span>
                                            <span>Started: {new Date(session.startedAt).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-medium">
                                            In Session
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 text-center space-y-1">
                            <p className="text-xs text-[#8B8B9E]">No candidates are taking a test right now.</p>
                            <p className="text-[11px] text-[#555568]">Candidates will appear here when they start your assessment.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Completed Interviews & Evaluation Reports */}
            {interviews.completed.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#8B8B9E]" />
                            <h2 className="text-sm font-semibold text-[#EDEDF0]">
                                Completed Interviews ({interviews.completed.length})
                            </h2>
                        </div>
                    </div>

                    <div className="border border-[#232330] bg-[#141419] rounded-xl overflow-hidden">
                        <div className="divide-y divide-[#232330]">
                            {interviews.completed.map((session) => (
                                <div
                                    key={session.sessionId}
                                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#1C1C24]/60 transition-colors"
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-[#EDEDF0]">
                                                {session.candidateName}
                                            </span>
                                            <span className="text-xs text-[#8B8B9E]">
                                                &lt;{session.candidateEmail}&gt;
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-[#8B8B9E] bg-[#0A0A0B] border border-[#232330]">
                                                FINISHED
                                            </span>
                                            {session.score !== null && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                                    Score: {session.score}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-[#8B8B9E] flex-wrap">
                                            <span>Assessment: <strong className="text-[#EDEDF0]">{session.assessmentTitle}</strong></span>
                                            <span>•</span>
                                            <span>Finished: {new Date(session.updatedAt).toLocaleDateString()} {new Date(session.updatedAt).toLocaleTimeString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {session.hasReport ? (
                                            <Link
                                                to={`/candidate/report/${session.sessionId}`}
                                                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>View report</span>
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={() => handleTriggerEvaluation(session.sessionId)}
                                                disabled={generatingReportId === session.sessionId}
                                                className="studio-btn-secondary text-xs py-1.5 px-3 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5"
                                            >
                                                {generatingReportId === session.sessionId ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                                        <span>Generating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        <span>Generate Report</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Assessment Pipeline Directory */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#8B8B9E]" />
                        <h2 className="text-sm font-semibold text-[#EDEDF0]">
                            Assessments
                        </h2>
                    </div>
                    <span className="text-xs text-[#555568]">
                        {assessments.length} total
                    </span>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl overflow-hidden">
                    {loadingAssessments ? (
                        <div className="p-12 flex items-center justify-center text-sm text-[#8B8B9E] gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                            <span>Loading assessments...</span>
                        </div>
                    ) : assessments.length > 0 ? (
                        <div className="divide-y divide-[#232330]">
                            {assessments.map((asmt) => (
                                <div
                                    key={asmt._id}
                                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#1C1C24]/60 transition-colors"
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="text-sm font-semibold text-[#EDEDF0]">
                                                {asmt.title || asmt.role?.title || 'Assessment'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#0A0A0B] text-[#8B8B9E] border border-[#232330]">
                                                {asmt.role?.title || asmt.roleTitle || 'General'}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                asmt.status === 'ACTIVE'
                                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                    : 'text-[#8B8B9E] bg-[#141419] border-[#232330]'
                                            }`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                <span className="capitalize">{asmt.status?.toLowerCase() || 'active'}</span>
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-[#8B8B9E] flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-xs text-[#EDEDF0] bg-[#0A0A0B] px-2 py-0.5 rounded border border-[#232330]">
                                                    {asmt.assessmentCode}
                                                </span>
                                                <button
                                                    onClick={() => handleCopyCode(asmt.assessmentCode)}
                                                    className="p-1 hover:text-[#EDEDF0] transition-colors"
                                                    title="Copy code"
                                                >
                                                    {copiedCode === asmt.assessmentCode ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5 text-[#8B8B9E]" />
                                                    )}
                                                </button>
                                            </div>
                                            <span>•</span>
                                            <span>{asmt.durationMinutes || 30} mins</span>
                                            <span>•</span>
                                            <span>Skills: {(asmt.skills || ['JavaScript', 'DSA']).join(', ')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 flex-shrink-0">
                                        <button
                                            onClick={() => handleToggleStatus(asmt._id)}
                                            className="studio-btn-secondary text-xs py-1.5 px-3"
                                            title="Toggle active status"
                                        >
                                            {asmt.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                            <span>{asmt.status === 'ACTIVE' ? 'Pause' : 'Activate'}</span>
                                        </button>
                                        <Link
                                            to={`/company/assessment/${asmt._id}/results`}
                                            className="btn-primary text-xs py-1.5 px-3.5"
                                        >
                                            <span>View results</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 text-center space-y-3">
                            <p className="text-sm text-[#8B8B9E]">No assessments created yet.</p>
                            <Link
                                to="/company/create-assessment"
                                className="btn-primary inline-flex text-xs py-2 px-4"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create your first assessment</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Configured Roles */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold text-[#EDEDF0]">
                        Configured Roles ({roles.length})
                    </h2>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl overflow-hidden">
                    {roles.length > 0 ? (
                        <div className="divide-y divide-[#232330]">
                            {roles.map((r) => (
                                <div key={r._id} className="p-4 text-xs hover:bg-[#1C1C24]/60 transition-colors">
                                    {editingRoleId === r._id ? (
                                        <form onSubmit={handleUpdateRole} className="space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    value={editRoleTitle}
                                                    onChange={(e) => setEditRoleTitle(e.target.value)}
                                                    className="studio-input text-xs"
                                                    placeholder="Role Title"
                                                    required
                                                />
                                                <input
                                                    type="text"
                                                    value={editRoleDesc}
                                                    onChange={(e) => setEditRoleDesc(e.target.value)}
                                                    className="studio-input text-xs"
                                                    placeholder="Role Description"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingRoleId(null)}
                                                    className="studio-btn-secondary text-xs py-1 px-3"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="btn-primary text-xs py-1 px-3"
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-0.5">
                                                <span className="font-medium text-[#EDEDF0] text-sm">{r.title}</span>
                                                {r.description && <p className="text-xs text-[#8B8B9E]">{r.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => startEditRole(r)}
                                                    className="p-1.5 rounded-md text-[#8B8B9E] hover:text-[#EDEDF0] hover:bg-[#232330] transition-colors"
                                                    title="Edit role specification"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRole(r._id)}
                                                    className="p-1.5 rounded-md text-[#8B8B9E] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Delete role profile"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-xs text-[#555568]">
                            No roles created yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
