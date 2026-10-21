import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    Terminal, 
    ArrowRight, 
    Copy, 
    Check, 
    ChevronLeft, 
    AlertCircle, 
    CheckCircle2, 
    Code2, 
    Layers,
    FileCode,
    Sliders
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
    const [openingTime, setOpeningTime] = useState('');
    const [closingTime, setClosingTime] = useState('');
    const [accessType, setAccessType] = useState('PUBLIC');
    const [eligibleEmails, setEligibleEmails] = useState('');
    const [codingRoundEnabled, setCodingRoundEnabled] = useState(true);
    const [voiceRoundEnabled, setVoiceRoundEnabled] = useState(true);

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
            setError('Please specify an assessment specification title');
            return;
        }
        if (!roleId) {
            setError('Please select an active role profile');
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
                blueprint: blueprint.trim(),
                openingTime: openingTime || null,
                closingTime: closingTime || null,
                accessType,
                eligibleEmails,
                codingRoundEnabled,
                voiceRoundEnabled
            });

            if (res.data.success) {
                setCreatedCode(res.data.data.assessmentCode);
                setCreatedId(res.data.data._id);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to initialize assessment specification');
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
            <div className="flex-1 flex items-center justify-center p-6 bg-[#09090B]">
                <div className="max-w-md w-full bg-[#111114] border border-[#222228] rounded-md p-8 text-center space-y-6 font-mono">
                    <div className="w-10 h-10 rounded bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mx-auto text-[#10B981]">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                        <span className="studio-badge bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                            SPEC GENERATED // LIVE
                        </span>
                        <h2 className="text-xl font-semibold text-[#FAFAFA] font-sans tracking-tight">
                            Assessment Successfully Deployed
                        </h2>
                        <p className="text-xs text-[#71717A]">
                            Share the unique access code or direct magic invite link with your candidates.
                        </p>
                    </div>

                    {/* Access Code Box */}
                    <div className="p-4 bg-[#09090B] border border-[#222228] rounded space-y-2">
                        <span className="text-[10px] uppercase text-[#52525B] tracking-wider block">
                            Candidate Assessment Access Code:
                        </span>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-xl sm:text-2xl font-bold tracking-widest text-[#FAFAFA]">
                                {createdCode}
                            </span>
                            <button
                                onClick={copyCode}
                                className="studio-btn-secondary p-1.5"
                                title="Copy Access Code"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        {createdId && (
                            <Link
                                to={`/company/assessment/${createdId}/results`}
                                className="studio-btn-primary w-full py-2.5 text-xs font-semibold"
                            >
                                <span>Open Assessment Leaderboard</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                        <Link
                            to="/company/dashboard"
                            className="studio-btn-secondary w-full py-2 text-xs"
                        >
                            Return to Recruiter Pipeline
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#09090B] text-[#FAFAFA] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#222228]">
                <Link
                    to="/company/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Pipeline</span>
                </Link>

                <div className="flex items-center gap-2">
                    <span className="studio-badge bg-[#111114] text-[#A1A1AA] border-[#222228]">
                        SPEC-BUILDER v2.4
                    </span>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-md text-xs font-mono text-[#F43F5E] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Two-Column Specification Studio */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Configuration Form (7 Cols) */}
                <div className="lg:col-span-7 bg-[#111114] border border-[#222228] rounded-md p-6 space-y-6 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                        <span className="font-semibold uppercase text-[#FAFAFA] tracking-wider">
                            Assessment Specification Parameters
                        </span>
                        <span className="text-[10px] text-[#52525B]">FORM // SPEC.CONF</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                Assessment Title:
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Senior Frontend Polyglot & AI Specialist"
                                className="studio-input"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                    Target Role Archetype:
                                </label>
                                <select
                                    value={roleId}
                                    onChange={(e) => setRoleId(e.target.value)}
                                    className="studio-input font-mono"
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
                                <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                    Seniority Expectation:
                                </label>
                                <select
                                    value={experienceLevel}
                                    onChange={(e) => setExperienceLevel(e.target.value)}
                                    className="studio-input font-mono"
                                >
                                    <option value="Entry">Entry / Junior Level</option>
                                    <option value="Mid">Mid Level (2-4 yrs)</option>
                                    <option value="Senior">Senior Level (5+ yrs)</option>
                                    <option value="Staff">Staff / Principal Level</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] uppercase text-[#A1A1AA]">
                                    Allocated Duration:
                                </label>
                                <span className="text-[11px] text-[#FAFAFA] tabular-nums">{durationMinutes} Minutes</span>
                            </div>
                            <input
                                type="range"
                                min="15"
                                max="60"
                                step="5"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                className="w-full accent-[#FAFAFA] bg-[#09090B]"
                            />
                            <div className="flex justify-between text-[10px] text-[#52525B]">
                                <span>15m (Rapid)</span>
                                <span>30m (Standard)</span>
                                <span>60m (Deep Dive)</span>
                            </div>
                        </div>

                        {/* Competency Skills Input */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                Evaluated Competencies & Languages:
                            </label>
                            <input
                                type="text"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={handleSkillKeyDown}
                                placeholder="Type skill or language and press Enter (e.g. Python, React, C++)"
                                className="studio-input"
                            />
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {skills.map((skill, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18181C] border border-[#222228] text-[11px] text-[#FAFAFA]"
                                    >
                                        <span>{skill}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSkill(skill)}
                                            className="text-[#71717A] hover:text-[#F43F5E]"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Interviewer Blueprint Guidance */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                Autonomous Interviewer Blueprint & Prompt:
                            </label>
                            <textarea
                                rows={3}
                                value={blueprint}
                                onChange={(e) => setBlueprint(e.target.value)}
                                placeholder="Focus deeply on distributed systems architecture, state management trade-offs, and Big-O efficiency."
                                className="studio-input resize-none"
                            />
                        </div>

                        {/* Assessment Time Window & Expiry */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                    Scheduled Opening Time (Optional):
                                </label>
                                <input
                                    type="datetime-local"
                                    value={openingTime}
                                    onChange={(e) => setOpeningTime(e.target.value)}
                                    className="studio-input font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                    Closing / Expiry Time (Optional):
                                </label>
                                <input
                                    type="datetime-local"
                                    value={closingTime}
                                    onChange={(e) => setClosingTime(e.target.value)}
                                    className="studio-input font-mono text-xs"
                                />
                            </div>
                        </div>

                        {/* Access Control & Eligibility Policy */}
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase text-[#A1A1AA] block">
                                Candidate Access Policy:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAccessType('PUBLIC')}
                                    className={`py-1.5 text-xs font-mono rounded border transition-all ${
                                        accessType === 'PUBLIC'
                                            ? 'bg-[#18181C] text-[#FAFAFA] border-[#3F3F46]'
                                            : 'text-[#71717A] border-[#222228] hover:text-[#FAFAFA]'
                                    }`}
                                >
                                    [PUBLIC ACCESS]
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAccessType('INVITE_ONLY')}
                                    className={`py-1.5 text-xs font-mono rounded border transition-all ${
                                        accessType === 'INVITE_ONLY'
                                            ? 'bg-[#18181C] text-[#FAFAFA] border-[#3F3F46]'
                                            : 'text-[#71717A] border-[#222228] hover:text-[#FAFAFA]'
                                    }`}
                                >
                                    [INVITE-ONLY RESTRICTED]
                                </button>
                            </div>

                            {accessType === 'INVITE_ONLY' && (
                                <div className="space-y-1 pt-1">
                                    <label className="text-[10px] uppercase text-[#71717A] block font-mono">
                                        Authorized Candidate Emails (comma or newline separated):
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={eligibleEmails}
                                        onChange={(e) => setEligibleEmails(e.target.value)}
                                        placeholder="sarah@example.com, alex@mit.edu"
                                        className="studio-input font-mono text-xs resize-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Round Flags */}
                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                            <label className="flex items-center gap-2 p-2.5 rounded bg-[#111114] border border-[#222228] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={voiceRoundEnabled}
                                    onChange={(e) => setVoiceRoundEnabled(e.target.checked)}
                                    className="accent-[#10B981]"
                                />
                                <span className="text-[#FAFAFA]">Voice Screening Round</span>
                            </label>
                            <label className="flex items-center gap-2 p-2.5 rounded bg-[#111114] border border-[#222228] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={codingRoundEnabled}
                                    onChange={(e) => setCodingRoundEnabled(e.target.checked)}
                                    className="accent-[#10B981]"
                                />
                                <span className="text-[#FAFAFA]">Polyglot Coding Round</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="studio-btn-primary w-full py-2.5 text-xs font-semibold"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-[#09090B] border-t-transparent rounded-full animate-spin"></span>
                                    <span>Deploying Assessment Manifest...</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <span>Deploy Assessment Specification</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Column: Sticky Live Specification Manifest Preview (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-[#111114] border border-[#222228] rounded-md p-5 space-y-3 font-mono text-xs sticky top-16">
                        <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                            <div className="flex items-center gap-2">
                                <FileCode className="w-3.5 h-3.5 text-[#10B981]" />
                                <span className="font-semibold uppercase text-[#FAFAFA]">
                                    Live Specification Manifest
                                </span>
                            </div>
                            <span className="text-[10px] text-[#10B981]">AUTONOMOUS-SYNC</span>
                        </div>

                        <pre className="p-3 bg-[#09090B] border border-[#222228] rounded text-[11px] text-[#A1A1AA] overflow-x-auto leading-relaxed">
{`# VoxCode Autonomous Assessment Manifest
spec_version: "2.4.0"
title: "${title || 'Untitled Assessment'}"
role_archetype: "${selectedRoleObj?.title || 'General Engineering'}"
seniority: "${experienceLevel}"
time_limit_seconds: ${durationMinutes * 60}
evaluation_engine: "gemini-2.5-flash"
compilers:
  - "javascript (node 24)"
  - "python 3 (3.14)"
  - "c++ (gcc 6.3)"
  - "java (openjdk 24)"
skills:
${skills.map(s => `  - "${s}"`).join('\n')}
blueprint_directive: >
  ${blueprint ? blueprint.replace(/\n/g, ' ') : 'Assess foundational problem solving, code clarity, and edge cases.'}
`}
                        </pre>

                        <div className="text-[10px] text-[#52525B] space-y-1 pt-1">
                            <span className="text-[#71717A] uppercase block">Security & Policy:</span>
                            <p>• Code is executed in native sub-second process isolation.</p>
                            <p>• Audio transcriptions scored across 4 dimensional rubrics.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateAssessment;
