import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { 
    Terminal, 
    Plus, 
    ExternalLink, 
    Copy, 
    Check, 
    Trash2, 
    Pause, 
    Play, 
    Layers, 
    Clock, 
    Users, 
    ChevronRight,
    AlertCircle,
    Activity
} from 'lucide-react';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [roles, setRoles] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [loadingAssessments, setLoadingAssessments] = useState(true);

    // role form state
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [roleTitle, setRoleTitle] = useState('');
    const [roleDesc, setRoleDesc] = useState('');
    const [roleError, setRoleError] = useState('');
    const [copiedCode, setCopiedCode] = useState(null);

    // fetch roles
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await api.get('/company/roles');
                if (res.data.success) setRoles(res.data.data);
            } catch (err) {
                console.error('Failed to fetch roles', err);
            } finally {
                setLoadingRoles(false);
            }
        };
        fetchRoles();
    }, []);

    // fetch assessments
    useEffect(() => {
        const fetchAssessments = async () => {
            try {
                const res = await api.get('/assessments');
                if (res.data.success) setAssessments(res.data.data);
            } catch (err) {
                console.error('Failed to fetch assessments', err);
            } finally {
                setLoadingAssessments(false);
            }
        };
        fetchAssessments();
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

    // delete role
    const handleDeleteRole = async (roleId) => {
        if (!window.confirm('Delete this role specification?')) return;
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

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const activeCount = assessments.filter(a => a.status === 'ACTIVE').length;

    return (
        <div className="flex-1 bg-[#09090B] text-[#FAFAFA] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Header Telemetry */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#222228] gap-3">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        <span className="font-mono text-[11px] text-[#A1A1AA] uppercase tracking-wider">
                            Recruiter Command // Pipeline Studio
                        </span>
                    </div>
                    <h1 className="text-lg font-semibold text-[#FAFAFA] tracking-tight">
                        {user?.name || 'Acme Engineering'}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowRoleForm(!showRoleForm)}
                        className="studio-btn-secondary text-xs"
                    >
                        <span>{showRoleForm ? 'Close Role Config' : '+ New Role Profile'}</span>
                    </button>
                    <Link
                        to="/company/create-assessment"
                        className="studio-btn-primary text-xs font-mono"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Assessment</span>
                    </Link>
                </div>
            </div>

            {/* Top 4-Column Connected Metric Bar */}
            <div className="border border-[#222228] bg-[#111114] rounded-md grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#222228] overflow-hidden">
                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Active Assessments
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {activeCount}
                        </span>
                        <span className="text-[11px] font-mono text-[#10B981]">online</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Total Created Specs
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {assessments.length}
                        </span>
                        <span className="text-[11px] font-mono text-[#52525B]">specs</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Configured Roles
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-semibold text-[#FAFAFA] tabular-nums">
                            {roles.length}
                        </span>
                        <span className="text-[11px] font-mono text-[#71717A]">archetypes</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">
                        Evaluation Engine
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-mono font-medium text-[#10B981]">
                            GEMINI 2.5 FLASH
                        </span>
                        <span className="text-[10px] font-mono text-[#52525B]">READY</span>
                    </div>
                </div>
            </div>

            {/* Quick Role Profile Form Drawer */}
            {showRoleForm && (
                <div className="bg-[#111114] border border-[#222228] rounded-md p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                        <span className="text-xs font-mono font-semibold uppercase text-[#FAFAFA]">
                            Configure New Job Role Profile
                        </span>
                        <span className="text-[10px] font-mono text-[#52525B]">SPECIFICATION ARTIFACT</span>
                    </div>

                    {roleError && (
                        <p className="text-xs font-mono text-[#F43F5E] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{roleError}</span>
                        </p>
                    )}

                    <form onSubmit={handleCreateRole} className="space-y-3 font-mono">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={roleTitle}
                                onChange={(e) => setRoleTitle(e.target.value)}
                                placeholder="Role Title (e.g. Senior Backend Engineer)"
                                className="studio-input"
                            />
                            <input
                                type="text"
                                value={roleDesc}
                                onChange={(e) => setRoleDesc(e.target.value)}
                                placeholder="Optional description or department"
                                className="studio-input"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowRoleForm(false)}
                                className="studio-btn-secondary text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="studio-btn-primary text-xs"
                            >
                                Save Role Profile
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Structured Assessment Pipeline Directory */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#71717A]" />
                        <h2 className="text-xs font-mono font-semibold uppercase text-[#A1A1AA] tracking-wider">
                            Assessment Pipeline Directory
                        </h2>
                    </div>
                    <span className="text-[11px] font-mono text-[#52525B]">
                        {assessments.length} total entries
                    </span>
                </div>

                <div className="border border-[#222228] bg-[#111114] rounded-md overflow-hidden">
                    {loadingAssessments ? (
                        <div className="p-12 flex items-center justify-center font-mono text-xs text-[#71717A] gap-2">
                            <div className="w-4 h-4 border-2 border-[#FAFAFA] border-t-transparent rounded-full animate-spin"></div>
                            <span>LOADING PIPELINE SPECIFICATIONS...</span>
                        </div>
                    ) : assessments.length > 0 ? (
                        <div className="divide-y divide-[#222228]">
                            {assessments.map((asmt) => (
                                <div
                                    key={asmt._id}
                                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#18181C] transition-colors"
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0 font-mono">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-sans text-xs font-semibold text-[#FAFAFA]">
                                                {asmt.title || asmt.role?.title || 'Assessment Specification'}
                                            </span>
                                            <span className="text-[11px] text-[#A1A1AA]">
                                                [{asmt.role?.title || asmt.roleTitle || 'General Engineering'}]
                                            </span>
                                            <span className={`studio-badge ${
                                                asmt.status === 'ACTIVE'
                                                    ? 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30'
                                                    : 'text-[#71717A] bg-[#18181C] border-[#222228]'
                                            }`}>
                                                {asmt.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[11px] text-[#71717A] flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#A1A1AA]">CODE: {asmt.assessmentCode}</span>
                                                <button
                                                    onClick={() => handleCopyCode(asmt.assessmentCode)}
                                                    className="p-0.5 hover:text-[#FAFAFA]"
                                                    title="Copy Assessment Code"
                                                >
                                                    {copiedCode === asmt.assessmentCode ? (
                                                        <Check className="w-3 h-3 text-[#10B981]" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </div>
                                            <span>•</span>
                                            <span>Duration: {asmt.durationMinutes || 30}m</span>
                                            <span>•</span>
                                            <span>Skills: {(asmt.skills || ['JavaScript', 'DSA']).join(', ')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                                        <button
                                            onClick={() => handleToggleStatus(asmt._id)}
                                            className="studio-btn-secondary text-[11px] py-1"
                                            title="Toggle active status"
                                        >
                                            {asmt.status === 'ACTIVE' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                            <span>{asmt.status === 'ACTIVE' ? 'Pause' : 'Activate'}</span>
                                        </button>
                                        <Link
                                            to={`/company/assessment/${asmt._id}/results`}
                                            className="studio-btn-primary text-[11px] py-1"
                                        >
                                            <span>Leaderboard & Results</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 text-center font-mono space-y-3">
                            <p className="text-xs text-[#71717A]">No technical assessments configured yet.</p>
                            <Link
                                to="/company/create-assessment"
                                className="studio-btn-primary text-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create First Assessment Specification</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Configured Role Archetypes Matrix */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-mono font-semibold uppercase text-[#A1A1AA] tracking-wider">
                        Configured Role Archetypes ({roles.length})
                    </span>
                </div>

                <div className="border border-[#222228] bg-[#111114] rounded-md overflow-hidden">
                    {roles.length > 0 ? (
                        <div className="divide-y divide-[#222228]">
                            {roles.map((r) => (
                                <div key={r._id} className="p-3.5 flex items-center justify-between gap-3 text-xs font-mono hover:bg-[#18181C]">
                                    <div className="space-y-0.5">
                                        <span className="font-semibold text-[#FAFAFA] font-sans">{r.title}</span>
                                        {r.description && <p className="text-[11px] text-[#71717A]">{r.description}</p>}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRole(r._id)}
                                        className="studio-btn-secondary p-1 text-[#71717A] hover:text-[#F43F5E] hover:border-[#F43F5E]/30"
                                        title="Delete role profile"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-xs font-mono text-[#52525B]">
                            No custom role archetypes defined yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
