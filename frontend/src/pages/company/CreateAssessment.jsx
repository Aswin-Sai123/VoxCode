import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    ArrowRight, 
    Copy, 
    Check, 
    ChevronLeft, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    Layers, 
    Loader2
} from 'lucide-react';

const CreateAssessment = () => {
    const navigate = useNavigate();

    // form state
    const [title, setTitle] = useState('');
    const [roleId, setRoleId] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState(['React', 'TypeScript', 'Node.js', 'Algorithms']);
    const [experienceLevel, setExperienceLevel] = useState('Mid');
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [blueprint, setBlueprint] = useState('');

    // other state
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdCode, setCreatedCode] = useState('');
    const [createdId, setCreatedId] = useState('');
    const [copied, setCopied] = useState(false);

    // fetch company's roles on mount
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await api.get('/company/roles');
                if (res.data.success) {
                    setRoles(res.data.data);
                    if (res.data.data.length > 0 && !roleId) {
                        setRoleId(res.data.data[0]._id);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch roles', err);
            }
        };
        fetchRoles();
    }, []);

    // add skill when pressing Enter
    const handleSkillKeyDown = (e) => {
        if (e.key === 'Enter' && skillInput.trim()) {
            e.preventDefault();
            if (!skills.includes(skillInput.trim())) {
                setSkills([...skills, skillInput.trim()]);
            }
            setSkillInput('');
        }
    };

    const removeSkill = (skillToRemove) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Please enter an assessment title');
            return;
        }
        if (!roleId) {
            setError('Please select a job role');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/assessments', {
                roleId,
                title: title.trim(),
                skills,
                experienceLevel,
                durationMinutes,
                blueprint: blueprint.trim()
            });

            if (res.data.success) {
                setCreatedCode(res.data.data.assessmentCode);
                setCreatedId(res.data.data._id);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create assessment');
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(createdCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const selectedRoleObj = roles.find(r => r._id === roleId);

    // SUCCESS Screen
    if (createdCode) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#141419] border border-[#232330] rounded-xl p-8 text-center space-y-6 shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>

                    <div className="space-y-1.5">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                            Assessment Ready
                        </span>
                        <h2 className="text-xl font-semibold text-[#EDEDF0] tracking-tight">
                            Assessment Created Successfully
                        </h2>
                        <p className="text-xs text-[#8B8B9E]">
                            Share this invitation code with your candidates to begin evaluations.
                        </p>
                    </div>

                    {/* Access Code Box */}
                    <div className="p-4 bg-[#0A0A0B] border border-[#232330] rounded-lg space-y-2">
                        <span className="text-xs text-[#8B8B9E] block">
                            Candidate Invitation Code:
                        </span>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl font-bold font-mono tracking-wider text-[#EDEDF0]">
                                {createdCode}
                            </span>
                            <button
                                onClick={copyCode}
                                className="studio-btn-secondary p-2"
                                title="Copy invitation code"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#8B8B9E]" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2.5 pt-2">
                        {createdId && (
                            <Link
                                to={`/company/assessment/${createdId}/results`}
                                className="btn-primary w-full py-2.5 text-xs font-medium"
                            >
                                <span>View Assessment Results</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                        <Link
                            to="/company/dashboard"
                            className="studio-btn-secondary w-full py-2 text-xs font-medium"
                        >
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#232330]">
                <Link
                    to="/company/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to dashboard</span>
                </Link>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Two-Column Specification Studio */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Configuration Form (7 Cols) */}
                <div className="lg:col-span-7 bg-[#141419] border border-[#232330] rounded-xl p-6 sm:p-7 space-y-5">
                    <div className="border-b border-[#232330] pb-3">
                        <h1 className="text-lg font-semibold text-[#EDEDF0]">
                            Create Assessment
                        </h1>
                        <p className="text-xs text-[#8B8B9E] mt-0.5">
                            Configure assessment parameters, duration, and target competencies.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#8B8B9E] block">
                                Assessment Title
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Senior Frontend Engineer Technical Interview"
                                className="studio-input"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#8B8B9E] block">
                                    Target Role
                                </label>
                                <select
                                    value={roleId}
                                    onChange={(e) => setRoleId(e.target.value)}
                                    className="studio-input"
                                >
                                    {roles.length === 0 ? (
                                        <option value="">No roles defined yet</option>
                                    ) : (
                                        roles.map(r => (
                                            <option key={r._id} value={r._id}>{r.title}</option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#8B8B9E] block">
                                    Seniority Level
                                </label>
                                <select
                                    value={experienceLevel}
                                    onChange={(e) => setExperienceLevel(e.target.value)}
                                    className="studio-input"
                                >
                                    <option value="Entry">Entry / Junior Level</option>
                                    <option value="Mid">Mid Level (2-4 yrs)</option>
                                    <option value="Senior">Senior Level (5+ yrs)</option>
                                    <option value="Staff">Staff / Principal Level</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-[#8B8B9E]">
                                    Allocated Duration
                                </label>
                                <span className="text-xs font-medium text-[#EDEDF0] tabular-nums">{durationMinutes} Minutes</span>
                            </div>
                            <input
                                type="range"
                                min="15"
                                max="60"
                                step="5"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                className="w-full accent-blue-500 bg-[#0A0A0B]"
                            />
                            <div className="flex justify-between text-[11px] text-[#555568]">
                                <span>15 mins (Rapid)</span>
                                <span>30 mins (Standard)</span>
                                <span>60 mins (In-depth)</span>
                            </div>
                        </div>

                        {/* Competency Skills Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#8B8B9E] block">
                                Required Skills & Technologies
                            </label>
                            <input
                                type="text"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={handleSkillKeyDown}
                                placeholder="Type a skill and press Enter (e.g. React, Python, DSA)"
                                className="studio-input"
                            />
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {skills.map((skill, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1C24] border border-[#232330] text-xs font-medium text-[#EDEDF0]"
                                    >
                                        <span>{skill}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSkill(skill)}
                                            className="text-[#8B8B9E] hover:text-red-400 font-bold"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Interviewer Blueprint Guidance */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#8B8B9E] block">
                                Custom Prompt / Interview Instructions (Optional)
                            </label>
                            <textarea
                                rows={3}
                                value={blueprint}
                                onChange={(e) => setBlueprint(e.target.value)}
                                placeholder="Focus on system scalability, code modularity, edge cases, and asynchronous programming."
                                className="studio-input resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-2.5 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Creating assessment...</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <span>Create Assessment</span>
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Column: Live Summary Card (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-5 sticky top-20">
                        <div className="border-b border-[#232330] pb-3">
                            <h2 className="text-sm font-semibold text-[#EDEDF0]">
                                Assessment Summary
                            </h2>
                            <p className="text-xs text-[#8B8B9E] mt-0.5">
                                Preview of the assessment configuration.
                            </p>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            <div>
                                <span className="text-[#8B8B9E] block">Title</span>
                                <span className="text-sm font-medium text-[#EDEDF0] mt-0.5 block">
                                    {title || 'Untitled Assessment'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <span className="text-[#8B8B9E] block">Role</span>
                                    <span className="text-xs font-medium text-[#EDEDF0] mt-0.5 block">
                                        {selectedRoleObj?.title || 'General Engineering'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[#8B8B9E] block">Level</span>
                                    <span className="text-xs font-medium text-[#EDEDF0] mt-0.5 block">
                                        {experienceLevel} Level
                                    </span>
                                </div>
                            </div>

                            <div className="pt-1">
                                <span className="text-[#8B8B9E] block">Duration</span>
                                <span className="text-xs font-medium text-[#EDEDF0] mt-0.5 block">
                                    {durationMinutes} minutes
                                </span>
                            </div>

                            <div className="pt-1">
                                <span className="text-[#8B8B9E] block mb-1.5">Skills ({skills.length})</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {skills.map((s, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-md bg-[#0A0A0B] border border-[#232330] text-xs text-[#8B8B9E]">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs text-[#8B8B9E] space-y-1">
                            <span className="text-[#EDEDF0] font-medium block">Evaluation runtime</span>
                            <p>
                                Candidates will be tested with conversational voice reasoning followed by live polyglot coding (JS, Python, C++, Java).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateAssessment;
