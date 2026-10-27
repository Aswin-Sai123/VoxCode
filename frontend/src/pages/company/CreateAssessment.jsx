import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    ArrowRight, 
    Copy, 
    Check, 
    ChevronLeft, 
    AlertCircle, 
    CheckCircle2, 
    Loader2,
    FileText,
    UploadCloud,
    Sparkles,
    Trash2
} from 'lucide-react';

const CreateAssessment = () => {
    // form state
    const [title, setTitle] = useState('');
    const [roleId, setRoleId] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState(['React', 'TypeScript', 'Node.js', 'Algorithms']);
    const [experienceLevel, setExperienceLevel] = useState('Mid');
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [blueprint, setBlueprint] = useState('');
    const [blueprintMode, setBlueprintMode] = useState('text'); // 'text' | 'file'
    const [blueprintFile, setBlueprintFile] = useState(null);
    const [blueprintAnalysis, setBlueprintAnalysis] = useState(null);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
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
                    if (res.data.data.length > 0) {
                        setRoleId(prev => prev || res.data.data[0]._id);
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

    const handleBlueprintFileUpload = async (file) => {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            setError('File size exceeds 20MB limit. Please upload a smaller blueprint document.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const base64Content = reader.result;
            const mimeType = file.type || 'application/pdf';
            setBlueprintFile({
                name: file.name,
                size: (file.size / 1024).toFixed(1) + ' KB',
                base64: base64Content,
                mimeType
            });
            // Automatically synthesize format with Gemini
            await triggerSynthesis({
                fileBase64: base64Content,
                mimeType,
                fileName: file.name
            });
        };
        reader.readAsDataURL(file);
    };

    const triggerSynthesis = async ({ fileBase64 = '', mimeType = '', fileName = '', text = '' } = {}) => {
        setIsSynthesizing(true);
        setError('');
        try {
            const res = await api.post('/assessments/synthesize-blueprint', {
                roleId,
                title,
                skills,
                experienceLevel,
                blueprintText: text || blueprint,
                fileBase64: fileBase64 || blueprintFile?.base64 || '',
                mimeType: mimeType || blueprintFile?.mimeType || 'application/pdf',
                fileName: fileName || blueprintFile?.name || ''
            });
            if (res.data.success && res.data.data?.analysis) {
                const analysis = res.data.data.analysis;
                setBlueprintAnalysis(analysis);
                if (analysis.codingRoundEnabled !== undefined) {
                    setCodingRoundEnabled(analysis.codingRoundEnabled);
                }
            }
        } catch (err) {
            console.error('Failed to synthesize blueprint:', err);
            setError(err.response?.data?.message || 'Failed to synthesize interview blueprint with Gemini.');
        } finally {
            setIsSynthesizing(false);
        }
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
                blueprint: blueprint.trim(),
                blueprintFileName: blueprintFile?.name || '',
                blueprintAnalysis,
                interviewFormat: blueprintAnalysis?.interviewFormat || (codingRoundEnabled ? 'FULL_INTERVIEW' : 'PROJECT_AND_TECHNICAL_ONLY'),
                openingTime: openingTime ? new Date(openingTime).toISOString() : null,
                closingTime: closingTime ? new Date(closingTime).toISOString() : null,
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
                        <h1 className="text-xl font-semibold tracking-tight text-[#EDEDF0]">
                            Create Assessment
                        </h1>
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

                        {/* AI Interview Blueprint Studio */}
                        <div className="bg-[#0A0A0B] border border-[#232330] rounded-xl p-4 sm:p-5 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xs font-semibold text-[#EDEDF0] flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Interview Blueprint & Hiring Directive</span>
                                    </h3>
                                    <p className="text-[11px] text-[#8B8B9E] mt-0.5 leading-relaxed">
                                        Upload your hiring document (.pdf, .docx, .txt) or paste your internal rubric to automatically configure competencies and interview format.
                                    </p>
                                </div>

                                <div className="segmented-pill-container flex-shrink-0 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => setBlueprintMode('text')}
                                        className={`px-2.5 py-1 font-medium transition-all ${
                                            blueprintMode === 'text'
                                                ? 'segmented-pill-btn-active'
                                                : 'segmented-pill-btn-inactive'
                                        }`}
                                    >
                                        Paste Text
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBlueprintMode('file')}
                                        className={`px-2.5 py-1 font-medium transition-all ${
                                            blueprintMode === 'file'
                                                ? 'segmented-pill-btn-active'
                                                : 'segmented-pill-btn-inactive'
                                        }`}
                                    >
                                        Upload File
                                    </button>
                                </div>
                            </div>

                            {blueprintMode === 'file' ? (
                                <div className="space-y-3">
                                    {!blueprintFile ? (
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDragging(false);
                                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                    handleBlueprintFileUpload(e.dataTransfer.files[0]);
                                                }
                                            }}
                                            onClick={() => document.getElementById('blueprint-file-input')?.click()}
                                            className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
                                                isDragging
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-[#232330] hover:border-[#38384A] bg-[#0A0A0B]/60'
                                            }`}
                                        >
                                            <input
                                                id="blueprint-file-input"
                                                type="file"
                                                accept=".pdf,.docx,.doc,.txt"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleBlueprintFileUpload(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                            <div className="flex flex-col items-center space-y-2">
                                                <div className="w-11 h-11 rounded-full bg-[#1C1C24] border border-[#232330] flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                                                    <UploadCloud className="w-5 h-5" />
                                                </div>
                                                <p className="text-xs font-semibold text-[#EDEDF0]">
                                                    Drop blueprint document here, or <span className="text-blue-400 hover:underline">browse</span>
                                                </p>
                                                <p className="text-[11px] text-[#555568]">
                                                    Supports PDF, DOCX, or TXT • Up to 20MB
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-[#141419] border border-blue-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[#EDEDF0] truncate font-medium">{blueprintFile.name}</p>
                                                    <p className="text-[11px] text-[#8B8B9E]">{blueprintFile.size} • Uploaded Document</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById('blueprint-file-input')?.click()}
                                                    className="studio-btn-secondary text-[11px] py-1 px-2 text-[#EDEDF0]"
                                                >
                                                    Replace
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBlueprintFile(null);
                                                        setBlueprintAnalysis(null);
                                                    }}
                                                    className="p-1 rounded text-[#8B8B9E] hover:text-red-400"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <input
                                                    id="blueprint-file-input"
                                                    type="file"
                                                    accept=".pdf,.docx,.doc,.txt"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handleBlueprintFileUpload(e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <textarea
                                        rows={4}
                                        value={blueprint}
                                        onChange={(e) => setBlueprint(e.target.value)}
                                        placeholder="Paste interview round guidelines, job description, expected technical topics, or question blueprints..."
                                        className="studio-input text-xs resize-y"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => triggerSynthesis({ text: blueprint })}
                                            disabled={isSynthesizing || !blueprint.trim()}
                                            className="studio-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 disabled:opacity-50"
                                        >
                                            {isSynthesizing ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    <span>Structuring format...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-3 h-3 text-blue-400" />
                                                    <span>Generate Round Format</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isSynthesizing && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2 text-xs text-blue-400 font-medium animate-pulse">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                                    <span>Analyzing blueprint and structuring assessment format...</span>
                                </div>
                            )}

                            {blueprintAnalysis && (
                                <div className="p-3.5 bg-[#141419] border border-blue-500/30 rounded-xl space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-[#EDEDF0] flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Structured Round Format</span>
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {blueprintAnalysis.roundType}
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-[#EDEDF0] leading-relaxed">
                                        {blueprintAnalysis.roundSummary}
                                    </p>

                                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                                        <span className="text-[#8B8B9E]">Coding Round:</span>
                                        <span className={codingRoundEnabled ? 'text-emerald-400 font-medium' : 'text-purple-400 font-medium'}>
                                            {codingRoundEnabled ? 'Live Coding IDE Enabled' : 'Discussion & Architecture Focus'}
                                        </span>
                                    </div>

                                    {blueprintAnalysis.keyCompetencies && blueprintAnalysis.keyCompetencies.length > 0 && (
                                        <div className="pt-1">
                                            <span className="text-[#8B8B9E] text-[10px] uppercase font-semibold block mb-1">Target Competencies:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {blueprintAnalysis.keyCompetencies.map((comp, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[10px] text-[#8B8B9E]">
                                                        {comp}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {blueprintAnalysis.interviewerPersonaPrompt && (
                                        <div className="pt-2 border-t border-[#232330]">
                                            <span className="text-[#8B8B9E] text-[10px] uppercase font-semibold block mb-1">Interviewer Guidelines:</span>
                                            <p className="text-[11px] text-[#8B8B9E] line-clamp-3 italic bg-[#0A0A0B] p-2 rounded border border-[#232330]">
                                                "{blueprintAnalysis.interviewerPersonaPrompt}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Assessment Time Window & Expiry */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#8B8B9E] block">
                                    Scheduled Opening Time (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={openingTime}
                                    onChange={(e) => setOpeningTime(e.target.value)}
                                    className="studio-input text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#8B8B9E] block">
                                    Closing / Expiry Time (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={closingTime}
                                    onChange={(e) => setClosingTime(e.target.value)}
                                    className="studio-input text-xs"
                                />
                            </div>
                        </div>

                        {/* Access Control & Eligibility Policy */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#8B8B9E] block">
                                Candidate Access Policy
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAccessType('PUBLIC')}
                                    className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                                        accessType === 'PUBLIC'
                                            ? 'bg-[#1C1C24] text-[#EDEDF0] border-[#363645] shadow-sm'
                                            : 'text-[#8B8B9E] border-[#232330] hover:text-[#EDEDF0] hover:bg-[#1C1C24]/40'
                                    }`}
                                >
                                    Public Access
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAccessType('INVITE_ONLY')}
                                    className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                                        accessType === 'INVITE_ONLY'
                                            ? 'bg-[#1C1C24] text-[#EDEDF0] border-[#363645] shadow-sm'
                                            : 'text-[#8B8B9E] border-[#232330] hover:text-[#EDEDF0] hover:bg-[#1C1C24]/40'
                                    }`}
                                >
                                    Invite-Only Restricted
                                </button>
                            </div>

                            {accessType === 'INVITE_ONLY' && (
                                <div className="space-y-1 pt-1">
                                    <label className="text-[11px] uppercase text-[#8B8B9E] block font-mono">
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
                            <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0A0A0B] border border-[#232330] hover:border-[#363645] cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={voiceRoundEnabled}
                                    onChange={(e) => setVoiceRoundEnabled(e.target.checked)}
                                    className="accent-blue-500 rounded"
                                />
                                <span className="text-[#EDEDF0]">Voice Screening Round</span>
                            </label>
                            <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0A0A0B] border border-[#232330] hover:border-[#363645] cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={codingRoundEnabled}
                                    onChange={(e) => setCodingRoundEnabled(e.target.checked)}
                                    className="accent-blue-500 rounded"
                                />
                                <span className="text-[#EDEDF0]">Polyglot Coding Round</span>
                            </label>
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
                            {blueprintAnalysis && (
                                <div className="pt-1 border-t border-[#232330]">
                                    <span className="text-[#8B8B9E] block mb-1">Round Format</span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-blue-400">
                                            {blueprintAnalysis.roundType}
                                        </span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${codingRoundEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                            {codingRoundEnabled ? 'IDE Coding' : 'Discussion Only'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs text-[#8B8B9E] space-y-1">
                            <span className="text-[#EDEDF0] font-medium block">Interview Structure</span>
                            <p>
                                {codingRoundEnabled 
                                    ? 'Rohan conducts conversational technical reasoning followed by a live coding challenge in the Monaco IDE.'
                                    : 'Rohan conducts an in-depth systems & architecture interview based on your blueprint.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateAssessment;
