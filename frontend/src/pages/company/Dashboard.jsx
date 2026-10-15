import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

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

    // copy code
    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        alert('Code copied!');
    };

    const activeCount = assessments.filter(a => a.status === 'ACTIVE').length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Company Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Welcome back, {user?.name}
                    </p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                    <button
                        onClick={() => navigate('/company/create-assessment')}
                        className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-dark hover:bg-gray-800 transition-all"
                    >
                        + Create Assessment
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-5">
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Roles</dt>
                    <dd className="text-2xl font-bold text-gray-900 mt-1">{roles.length}</dd>
                </div>
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-5">
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Assessments</dt>
                    <dd className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</dd>
                </div>
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-5">
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Assessments</dt>
                    <dd className="text-2xl font-bold text-gray-900 mt-1">{assessments.length}</dd>
                </div>
            </div>

            {/* Manage Roles Section */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 mb-8 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Manage Roles</h3>
                    <button
                        onClick={() => setShowRoleForm(!showRoleForm)}
                        className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                        {showRoleForm ? 'Cancel' : '+ Add Role'}
                    </button>
                </div>

                {/* Add Role Form */}
                {showRoleForm && (
                    <form onSubmit={handleCreateRole} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                        {roleError && (
                            <p className="text-red-500 text-sm font-medium">{roleError}</p>
                        )}
                        <input
                            type="text"
                            value={roleTitle}
                            onChange={(e) => setRoleTitle(e.target.value)}
                            placeholder="Role title (e.g. Frontend Developer)"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                            type="text"
                            value={roleDesc}
                            onChange={(e) => setRoleDesc(e.target.value)}
                            placeholder="Short description (optional)"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-dark text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all"
                        >
                            Create Role
                        </button>
                    </form>
                )}

                {/* Roles List */}
                {loadingRoles ? (
                    <p className="text-gray-400 text-sm">Loading roles...</p>
                ) : roles.length === 0 ? (
                    <p className="text-gray-400 text-sm">No roles created yet. Click "+ Add Role" to get started.</p>
                ) : (
                    <div className="space-y-2">
                        {roles.map(role => (
                            <div key={role._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{role.title}</p>
                                    {role.description && (
                                        <p className="text-xs text-gray-500">{role.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteRole(role._id)}
                                    className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assessments Section */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Your Assessments</h3>

                {loadingAssessments ? (
                    <p className="text-gray-400 text-sm">Loading assessments...</p>
                ) : assessments.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg py-12 flex flex-col items-center justify-center">
                        <p className="text-gray-400 mb-3">No assessments yet</p>
                        <button
                            onClick={() => navigate('/company/create-assessment')}
                            className="text-sm font-bold text-primary-600 hover:text-primary-700"
                        >
                            Create your first assessment →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {assessments.map(assessment => (
                            <div key={assessment._id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-bold text-gray-900">{assessment.title}</h4>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                assessment.status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {assessment.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Role: {assessment.role?.title || 'N/A'} • {assessment.experienceLevel} • {assessment.durationMinutes} min
                                        </p>
                                        {assessment.skills && assessment.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {assessment.skills.map((skill, i) => (
                                                    <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                        <span
                                            onClick={() => copyCode(assessment.assessmentCode)}
                                            className="text-xs font-mono bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-all text-gray-700"
                                            title="Click to copy"
                                        >
                                            {assessment.assessmentCode}
                                        </span>
                                        <button
                                            onClick={() => handleToggleStatus(assessment._id)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                                                assessment.status === 'ACTIVE'
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                            }`}
                                        >
                                            {assessment.status === 'ACTIVE' ? 'Close' : 'Reopen'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
