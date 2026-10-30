import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { UNIVERSAL_BLUEPRINT_FORMAT } from '../../data/blueprintTemplates';
import { extractEmailsFromSpreadsheet } from '../../utils/excelParser';
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
    Trash2, 
    BookOpen, 
    X, 
    MessageSquare, 
    Terminal,
    FileSpreadsheet
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

    // universal format modal state
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [formatCopied, setFormatCopied] = useState(false);

    // excel upload state & staged creation status
    const [excelFile, setExcelFile] = useState(null);
    const [isExtractingEmails, setIsExtractingEmails] = useState(false);
    const [creationStep, setCreationStep] = useState('');

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

    const applyUniversalFormat = () => {
        setBlueprintMode('text');
        setBlueprint(UNIVERSAL_BLUEPRINT_FORMAT);
        setBlueprintFile(null);
        setShowTemplateModal(false);
    };

    const copyUniversalFormat = () => {
        navigator.clipboard.writeText(UNIVERSAL_BLUEPRINT_FORMAT);
        setFormatCopied(true);
        setTimeout(() => setFormatCopied(false), 2000);
    };

    const handleExcelUpload = async (file) => {
        if (!file) return;
        setIsExtractingEmails(true);
        setError('');
        try {
            const { emails, fileName, totalFound } = await extractEmailsFromSpreadsheet(file);
            if (totalFound === 0) {
                setError(`No valid candidate email addresses found in "${fileName}". Please check your spreadsheet column names or content.`);
                return;
            }

            setExcelFile({
                name: fileName,
                size: (file.size / 1024).toFixed(1) + ' KB',
                count: totalFound
            });

            // Merge with existing eligibleEmails without duplicates
            const existing = eligibleEmails
                ? eligibleEmails.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean)
                : [];
            const merged = Array.from(new Set([...existing, ...emails]));
            setEligibleEmails(merged.join('\n'));
        } catch (err) {
            console.error('Failed to extract emails from spreadsheet:', err);
            setError('Failed to parse spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file.');
        } finally {
            setIsExtractingEmails(false);
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
        if (!blueprint.trim() && !blueprintFile) {
            setError('Interview blueprint is required. Please paste your interview guidelines or upload a document so the AI interviewer can configure the round structure.');
            return;
        }

        let parsedEmails = [];
        if (accessType === 'INVITE_ONLY') {
            parsedEmails = eligibleEmails
                ? eligibleEmails.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean)
                : [];
            parsedEmails = Array.from(new Set(parsedEmails));
            if (parsedEmails.length === 0) {
                setError('Please provide at least one authorized candidate email or upload an Excel spreadsheet for invite-only assessments.');
                return;
            }
        }

        setLoading(true);
        try {
            setCreationStep('Validating assessment configuration and access policy...');
            await new Promise(r => setTimeout(r, 650));

            if (accessType === 'INVITE_ONLY') {
                setCreationStep(`Indexing and verifying ${parsedEmails.length} authorized candidate email(s)...`);
                await new Promise(r => setTimeout(r, 650));
            }

            setCreationStep('Structuring interview blueprint & evaluation rubrics with AI...');
            let finalAnalysis = blueprintAnalysis;
            if (!finalAnalysis) {
                try {
                    const synRes = await api.post('/assessments/synthesize-blueprint', {
                        roleId,
                        title: title.trim(),
                        skills,
                        experienceLevel,
                        blueprintText: blueprint.trim(),
                        fileBase64: blueprintFile?.base64 || '',
                        mimeType: blueprintFile?.mimeType || 'application/pdf',
                        fileName: blueprintFile?.name || ''
                    });
                    if (synRes.data.success && synRes.data.data?.analysis) {
                        finalAnalysis = synRes.data.data.analysis;
                        setBlueprintAnalysis(finalAnalysis);
                    }
                } catch (synErr) {
                    console.warn('Synthesis in background, server-side fallback active:', synErr);
                }
            }

            setCreationStep('Generating cryptographically unique assessment code & security tokens...');
            await new Promise(r => setTimeout(r, 650));

            const res = await api.post('/assessments', {
                roleId,
                title: title.trim(),
                skills,
                experienceLevel,
                durationMinutes,
                blueprint: blueprint.trim(),
                blueprintFileName: blueprintFile?.name || '',
                blueprintAnalysis: finalAnalysis,
                interviewFormat: finalAnalysis?.interviewFormat || (codingRoundEnabled ? 'FULL_INTERVIEW' : 'PROJECT_AND_TECHNICAL_ONLY'),
                openingTime: openingTime ? new Date(openingTime).toISOString() : null,
                closingTime: closingTime ? new Date(closingTime).toISOString() : null,
                accessType,
                eligibleEmails: parsedEmails,
                codingRoundEnabled,
                voiceRoundEnabled: true
            });

            if (res.data.success) {
                setCreationStep('Finalizing configuration and provisioning evaluation workspace...');
                await new Promise(r => setTimeout(r, 500));
                setCreatedCode(res.data.data.assessmentCode);
                setCreatedId(res.data.data._id);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create assessment');
        } finally {
            setLoading(false);
            setCreationStep('');
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
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-semibold text-[#EDEDF0] flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                            <span>Interview Blueprint & Hiring Directive</span>
                                        </h3>
                                        <span className="text-[11px] font-semibold text-red-400">* Required</span>
                                    </div>
                                    <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                        Upload your hiring document (.pdf, .docx, .txt) or paste your internal rubric. The AI interviewer derives interview phases, live coding requirements, and question counts directly from this blueprint.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 self-start flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplateModal(true)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                                        title="View universal blueprint text format"
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>Universal Format</span>
                                    </button>

                                    <div className="segmented-pill-container text-[11px]">
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
                                <div className="p-3.5 bg-[#141419] border border-blue-500/30 rounded-xl space-y-3 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-[#EDEDF0] flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Derived Interview Blueprint Structure</span>
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {blueprintAnalysis.roundType?.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-[#EDEDF0] leading-relaxed">
                                        {blueprintAnalysis.roundSummary}
                                    </p>

                                    {/* Phases & Coding Status */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                                        <div className="p-2.5 rounded-lg bg-[#0A0A0B] border border-[#232330] space-y-1">
                                            <span className="text-[#8B8B9E] block">Live Coding Phase:</span>
                                            <span className={`font-semibold flex items-center gap-1.5 ${codingRoundEnabled ? 'text-emerald-400' : 'text-purple-400'}`}>
                                                {codingRoundEnabled ? (
                                                    <>
                                                        <Terminal className="w-3.5 h-3.5" />
                                                        <span>Monaco IDE Challenge Enabled</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        <span>Verbal Problem Solving (No IDE)</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-[#0A0A0B] border border-[#232330] space-y-1">
                                            <span className="text-[#8B8B9E] block">Estimated Questions:</span>
                                            <span className="font-semibold text-[#EDEDF0]">
                                                {blueprintAnalysis.estimatedQuestions || '4-5 Questions across phases'}
                                            </span>
                                        </div>
                                    </div>

                                    {blueprintAnalysis.phases && blueprintAnalysis.phases.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                            <span className="text-[#8B8B9E] text-[10px] uppercase font-semibold block">Sequential Round Phases:</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                {blueprintAnalysis.phases.map((phase, idx) => (
                                                    <div key={idx} className="p-2 rounded bg-[#0A0A0B] border border-[#232330] text-[11px] text-[#EDEDF0] flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                                        <span>{phase}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {blueprintAnalysis.keyCompetencies && blueprintAnalysis.keyCompetencies.length > 0 && (
                                        <div className="pt-1">
                                            <span className="text-[#8B8B9E] text-[10px] uppercase font-semibold block mb-1">Target Evaluation Competencies:</span>
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
                                <div className="space-y-3 pt-2 border-t border-[#232330]">
                                    {/* Excel / Spreadsheet Upload Card */}
                                    <div className="p-3.5 bg-[#0A0A0B] border border-[#232330] rounded-xl space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[#EDEDF0] flex items-center gap-1.5">
                                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>Import Candidates from Excel / Spreadsheet</span>
                                            </span>
                                            <span className="text-[10px] font-mono text-[#8B8B9E]">.xlsx, .xls, .csv</span>
                                        </div>
                                        <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                            Upload your candidates list. VoxCode automatically detects email columns (e.g. "Email", "Mail", "Candidate Email") and extracts all valid emails.
                                        </p>

                                        {!excelFile ? (
                                            <div
                                                onClick={() => document.getElementById('excel-file-input')?.click()}
                                                className="border border-dashed border-[#2D2D3D] hover:border-emerald-500/50 bg-[#121217] hover:bg-[#14141C] rounded-lg p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5"
                                            >
                                                <input
                                                    id="excel-file-input"
                                                    type="file"
                                                    accept=".xlsx,.xls,.csv"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handleExcelUpload(e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                    {isExtractingEmails ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <UploadCloud className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium text-[#EDEDF0]">
                                                    {isExtractingEmails ? 'Scanning spreadsheet and extracting emails...' : 'Click or drop Excel spreadsheet here'}
                                                </p>
                                                <p className="text-[10px] text-[#555568]">
                                                    Supports Excel (.xlsx, .xls) and CSV sheets with any number of rows
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-[#14141A] border border-emerald-500/30 rounded-lg flex items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                                        <FileSpreadsheet className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[#EDEDF0] truncate font-medium">{excelFile.name}</p>
                                                        <p className="text-[11px] text-emerald-400 font-mono">
                                                            ✓ {excelFile.count} email{excelFile.count !== 1 ? 's' : ''} extracted ({excelFile.size})
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById('excel-file-input')?.click()}
                                                        className="studio-btn-secondary text-[11px] py-1 px-2 text-[#EDEDF0]"
                                                    >
                                                        Replace
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExcelFile(null);
                                                            setEligibleEmails('');
                                                        }}
                                                        className="p-1 rounded text-[#8B8B9E] hover:text-red-400"
                                                        title="Remove spreadsheet"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <input
                                                        id="excel-file-input"
                                                        type="file"
                                                        accept=".xlsx,.xls,.csv"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                handleExcelUpload(e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Email List Textarea */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <label className="text-[11px] font-medium text-[#8B8B9E] flex items-center gap-1.5">
                                                <span>Authorized Candidate Emails</span>
                                                {eligibleEmails && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        {eligibleEmails.split(/[\n,;]+/).filter(e => e.trim()).length} candidates
                                                    </span>
                                                )}
                                            </label>
                                            {eligibleEmails && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEligibleEmails('')}
                                                    className="text-[10px] text-[#8B8B9E] hover:text-red-400 transition-colors"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={eligibleEmails}
                                            onChange={(e) => setEligibleEmails(e.target.value)}
                                            placeholder="Paste candidate emails or upload an Excel file above (sarah@example.com, alex@mit.edu)..."
                                            className="studio-input font-mono text-xs resize-y"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Derived Interview Execution Directive */}
                        <div className="p-3.5 bg-[#0A0A0B] border border-[#232330] rounded-xl space-y-2.5 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[#EDEDF0]">Interview Format & Live Coding</span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${codingRoundEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                            {codingRoundEnabled ? 'Live Monaco Coding' : 'Verbal Technical Discussion'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                        {codingRoundEnabled
                                            ? 'Derived from blueprint: Spoken technical evaluation followed by hands-on algorithmic coding and test execution in Monaco IDE.'
                                            : 'Derived from blueprint: In-depth conversational architecture & verbal coding. Any technical problem solving is explained verbally with zero live coding.'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setCodingRoundEnabled(!codingRoundEnabled)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 self-start sm:self-center flex-shrink-0 ${
                                        codingRoundEnabled
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                            : 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'
                                    }`}
                                    title="Manual override for live coding IDE challenge"
                                >
                                    {codingRoundEnabled ? (
                                        <>
                                            <Terminal className="w-3.5 h-3.5" />
                                            <span>Coding IDE: On</span>
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>Verbal Only</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-2.5 mt-2 transition-all duration-200"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-white flex-shrink-0" />
                                    <span className="text-xs font-medium">{creationStep || 'Creating assessment...'}</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-1.5">
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

                            {blueprintAnalysis ? (
                                <div className="pt-2 border-t border-[#232330] space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#8B8B9E]">Round Format</span>
                                        <span className="font-medium text-blue-400">
                                            {blueprintAnalysis.roundType?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#8B8B9E]">Coding Phase</span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${codingRoundEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                            {codingRoundEnabled ? 'Monaco IDE Challenge' : 'Verbal Only'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#8B8B9E]">Questions</span>
                                        <span className="text-[#EDEDF0] font-medium text-[11px]">
                                            {blueprintAnalysis.estimatedQuestions || '4-5 Questions across phases'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-2 border-t border-[#232330] text-xs text-[#8B8B9E] space-y-1">
                                    <span className="text-[#8B8B9E] block">Round Format</span>
                                    <span className="text-[11px] text-[#555568] block">Will be structured automatically from your interview blueprint.</span>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs text-[#8B8B9E] space-y-1.5">
                            <span className="text-[#EDEDF0] font-medium block">Interviewer Pipeline</span>
                            <p className="text-[11px] leading-relaxed">
                                {codingRoundEnabled 
                                    ? 'Rohan conducts natural spoken technical rounds followed by a live coding challenge with automated test runs in Monaco IDE.'
                                    : 'Rohan conducts an in-depth conversational architecture and technical reasoning session with zero IDE coding.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Universal Blueprint Format Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#141419] border border-[#232330] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-[#232330]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-[#EDEDF0]">
                                        Universal Blueprint Format
                                    </h3>
                                    <p className="text-xs text-[#8B8B9E]">
                                        Standard structure used by the AI interviewer to configure technical rounds.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTemplateModal(false)}
                                className="p-1.5 rounded-lg text-[#8B8B9E] hover:text-[#EDEDF0] hover:bg-[#1C1C24] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: Universal Text Only */}
                        <div className="p-5 overflow-y-auto space-y-3 flex-1">
                            <textarea
                                readOnly
                                rows={14}
                                value={UNIVERSAL_BLUEPRINT_FORMAT}
                                className="w-full p-4 bg-[#0A0A0B] border border-[#232330] rounded-xl font-mono text-xs text-[#EDEDF0] leading-relaxed resize-none focus:outline-none select-all"
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-[#232330] flex items-center justify-between gap-3 bg-[#0E0E12]">
                            <button
                                type="button"
                                onClick={copyUniversalFormat}
                                className="studio-btn-secondary px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 text-[#EDEDF0]"
                            >
                                {formatCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8B8B9E]" />}
                                <span>{formatCopied ? 'Copied' : 'Copy Format'}</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateModal(false)}
                                    className="studio-btn-secondary px-3.5 py-2 text-xs font-medium"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={applyUniversalFormat}
                                    className="btn-primary px-4 py-2 text-xs font-medium flex items-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Insert into Blueprint</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateAssessment;
