import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    ArrowRight, 
    Clock, 
    Mic, 
    Volume2, 
    Cpu, 
    AlertCircle, 
    ChevronLeft,
    CheckCircle2,
    Code2,
    MessageSquare,
    Loader2,
    FileText,
    Sparkles,
    Check,
    Layers,
    FolderGit2,
    CheckCircle
} from 'lucide-react';

const AssessmentLobby = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Resume & Project Discussion Context
    const [resumeText, setResumeText] = useState('');
    const [parsedProjects, setParsedProjects] = useState([]);
    const [isParsingResume, setIsParsingResume] = useState(false);
    const [parseSuccess, setParseSuccess] = useState(false);

    // Interview Format: 'FULL_INTERVIEW' | 'PROJECT_AND_TECHNICAL_ONLY'
    const [interviewFormat, setInterviewFormat] = useState('FULL_INTERVIEW');

    useEffect(() => {
        const verifyCode = async () => {
            try {
                const res = await api.get(`/assessments/join/${code}`);
                if (res.data.success) {
                    setAssessment(res.data.data);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Could not find an assessment matching this code.');
            } finally {
                setLoading(false);
            }
        };

        const fetchCandidateResume = async () => {
            try {
                const res = await api.get('/candidate/resume');
                if (res.data.success && res.data.data) {
                    if (res.data.data.resumeText) {
                        setResumeText(res.data.data.resumeText);
                    }
                    if (res.data.data.parsedProjects?.length) {
                        setParsedProjects(res.data.data.parsedProjects);
                    }
                }
            } catch {
                // Non-critical if candidate is guest or endpoint is pending
            }
        };

        verifyCode();
        fetchCandidateResume();
    }, [code]);

    const handleParseResume = async () => {
        if (!resumeText.trim()) return;
        setIsParsingResume(true);
        setParseSuccess(false);

        try {
            const res = await api.post('/candidate/resume', { resumeText: resumeText.trim() });
            if (res.data.success) {
                const projects = res.data.data?.parsedData?.projects || res.data.data?.candidate?.parsedProjects || [];
                setParsedProjects(projects);
                setParseSuccess(true);
                setTimeout(() => setParseSuccess(false), 5000);
            }
        } catch (err) {
            console.error('Failed to parse resume:', err);
        } finally {
            setIsParsingResume(false);
        }
    };

    const handleStartInterview = () => {
        // Persist to session storage so refresh or reconnection preserves context
        sessionStorage.setItem(`voxcode_resume_${code}`, resumeText);
        sessionStorage.setItem(`voxcode_format_${code}`, interviewFormat);
        sessionStorage.setItem('voxcode_resume', resumeText);

        navigate(`/candidate/interview/${code}`, {
            state: {
                resumeText,
                interviewFormat
            }
        });
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <div className="flex items-center gap-3 text-sm text-[#8B8B9E]">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Loading assessment details...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#141419] border border-red-500/20 rounded-xl p-8 space-y-5 text-center">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-base font-semibold text-[#EDEDF0]">Assessment not found</h2>
                        <p className="text-xs text-[#8B8B9E]">{error}</p>
                    </div>
                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="studio-btn-secondary w-full py-2.5 text-xs font-medium"
                    >
                        Back to dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
            {/* Navigation & Code pill */}
            <div className="flex items-center justify-between">
                <Link
                    to="/candidate/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to dashboard</span>
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#555568]">Assessment Code:</span>
                    <span className="font-mono text-xs text-[#EDEDF0] bg-[#141419] px-2.5 py-1 rounded-md border border-[#232330]">
                        {code}
                    </span>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Assessment Details, Format & Resume Context (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Header Card */}
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 sm:p-8 space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0A0A0B] text-[#8B8B9E] border border-[#232330]">
                                    {assessment.companyName || 'Hiring Team'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {assessment.experienceLevel || 'Mid-Senior'}
                                </span>
                                {assessment.assessmentType === 'MOCK' ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Mock Practice • Full Report Unlocked
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Official Test • Confidential to Recruiter
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDF0]">
                                {assessment.title || assessment.roleTitle}
                            </h1>
                            <div className="flex items-center gap-4 text-xs text-[#8B8B9E] pt-1">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-[#555568]" />
                                    <span>{assessment.durationMinutes || 30} minutes total</span>
                                </span>
                                <span>•</span>
                                <span>Target Role: {assessment.roleTitle}</span>
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="space-y-2 pt-2 border-t border-[#232330]">
                            <span className="text-xs font-medium text-[#8B8B9E] block">
                                Focus areas & technologies:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {(assessment.skills || ['JavaScript', 'System Architecture', 'Algorithms']).map((skill, i) => (
                                    <span
                                        key={i}
                                        className="px-2.5 py-1 rounded-md bg-[#1C1C24] text-[#EDEDF0] border border-[#232330] text-xs font-medium"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Interview Round Format Selector */}
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h2 className="text-sm font-semibold text-[#EDEDF0] flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-400" />
                                    <span>Select Interview Round Format</span>
                                </h2>
                                <p className="text-xs text-[#8B8B9E]">
                                    Not all real interviews require live coding. Choose the format that matches your round.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Option 1: Full Technical Loop */}
                            <button
                                type="button"
                                onClick={() => setInterviewFormat('FULL_INTERVIEW')}
                                className={`text-left p-4 rounded-xl border transition-all relative ${
                                    interviewFormat === 'FULL_INTERVIEW'
                                        ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/5'
                                        : 'bg-[#0A0A0B] border-[#232330] hover:border-[#38384A]'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                        interviewFormat === 'FULL_INTERVIEW'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-[#1C1C24] text-[#8B8B9E]'
                                    }`}>
                                        Full Loop
                                    </span>
                                    {interviewFormat === 'FULL_INTERVIEW' && (
                                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                    )}
                                </div>
                                <h3 className="text-xs font-semibold text-[#EDEDF0] mb-1 flex items-center gap-1.5">
                                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Technical Discussion + Live Coding</span>
                                </h3>
                                <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                    Initial project & system architecture discussion, followed by an interviewer-initiated live coding challenge in the IDE.
                                </p>
                            </button>

                            {/* Option 2: Project & Technical Architecture Only */}
                            <button
                                type="button"
                                onClick={() => setInterviewFormat('PROJECT_AND_TECHNICAL_ONLY')}
                                className={`text-left p-4 rounded-xl border transition-all relative ${
                                    interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                        ? 'bg-purple-500/10 border-purple-500/50 shadow-lg shadow-purple-500/5'
                                        : 'bg-[#0A0A0B] border-[#232330] hover:border-[#38384A]'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                        interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                            ? 'bg-purple-500/20 text-purple-400'
                                            : 'bg-[#1C1C24] text-[#8B8B9E]'
                                    }`}>
                                        Architecture Only
                                    </span>
                                    {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY' && (
                                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                                    )}
                                </div>
                                <h3 className="text-xs font-semibold text-[#EDEDF0] mb-1 flex items-center gap-1.5">
                                    <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Project & System Architecture (No Coding)</span>
                                </h3>
                                <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                    Deep dive into your actual projects, architectural trade-offs, scalability, and engineering choices. No coding round required.
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Resume & Project Discussion Context Card */}
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-sm font-semibold text-[#EDEDF0] flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    <span>Resume & Project Highlights</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        <span>Powers LLM Project Deep-Dive</span>
                                    </span>
                                </h2>
                                <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                    Paste your resume text or bullet points of your key projects. The AI tech lead uses this to ask authentic questions about your real technical experience and architectural decisions.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="relative">
                                <textarea
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    rows={4}
                                    placeholder="Paste your resume summary, LinkedIn projects, or key project details here (e.g., 'Built a distributed real-time chat service using Node.js, Redis Pub/Sub, and MongoDB with 15k concurrent users...')"
                                    className="w-full bg-[#0A0A0B] border border-[#232330] rounded-xl p-3.5 text-xs text-[#EDEDF0] placeholder-[#555568] focus:outline-none focus:border-emerald-500/50 leading-relaxed font-sans resize-y"
                                />
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleParseResume}
                                    disabled={isParsingResume || !resumeText.trim()}
                                    className="studio-btn-secondary px-3.5 py-2 text-xs flex items-center gap-2 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                                >
                                    {isParsingResume ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Extracting Projects with Gemini...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Auto-Parse Projects</span>
                                        </>
                                    )}
                                </button>

                                {parseSuccess && (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-fadeIn">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>Projects extracted & saved to profile!</span>
                                    </span>
                                )}
                            </div>

                            {/* Render Parsed Projects Cards if available */}
                            {parsedProjects.length > 0 && (
                                <div className="pt-2 space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B8B9E] block">
                                        Parsed Projects ({parsedProjects.length})
                                    </span>
                                    <div className="grid grid-cols-1 gap-2">
                                        {parsedProjects.map((p, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg space-y-1.5 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-[#EDEDF0] flex items-center gap-1.5">
                                                        <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span>{p.title}</span>
                                                    </span>
                                                    {p.techStack && p.techStack.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {p.techStack.slice(0, 3).map((t, ti) => (
                                                                <span
                                                                    key={ti}
                                                                    className="px-1.5 py-0.5 rounded bg-[#1C1C24] text-[10px] text-[#8B8B9E] border border-[#232330]"
                                                                >
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {p.description && (
                                                    <p className="text-[11px] text-[#8B8B9E] leading-relaxed">
                                                        {p.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Interview Phases Breakdown */}
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-[#EDEDF0]">
                            Interview Flow Breakdown
                        </h2>
                        
                        <div className="space-y-3">
                            <div className="p-4 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-start gap-3.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-blue-400">
                                    1
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-[#EDEDF0]">
                                            {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                                ? 'Deep Project & Architecture Walkthrough'
                                                : 'Technical & Project Discussion'}
                                        </span>
                                        <span className="text-xs text-[#555568]">
                                            {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY' ? '~15 mins' : '~10 mins'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                        Interactive conversational dialogue with your AI interviewer. Walk through your resume projects, database selections, API design, and trade-offs.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-start gap-3.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                                    interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                        ? 'bg-purple-600/10 border border-purple-500/20 text-purple-400'
                                        : 'bg-blue-600/10 border border-blue-500/20 text-blue-400'
                                }`}>
                                    2
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-[#EDEDF0]">
                                            {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                                ? 'System Scalability & Production Failure Strategy'
                                                : 'Interviewer-Initiated Live Coding Challenge'}
                                        </span>
                                        <span className="text-xs text-[#555568]">
                                            {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY' ? '~15 mins' : '~20 mins'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                        {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                            ? 'In-depth discussion on edge-case mitigation, P99 latency, caching, and handling distributed system failures. Live coding is skipped.'
                                            : 'When ready, the interviewer transitions the workspace to a tailored coding challenge with real-time Monaco IDE code execution.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Readiness Checklist & CTA (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 sm:p-7 space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-sm font-semibold text-[#EDEDF0]">
                                Setup Checklist
                            </h2>
                            <p className="text-xs text-[#8B8B9E]">
                                Verify audio and workspace readiness before entering the interview room.
                            </p>
                        </div>

                        {/* Time Window Specification */}
                        {(assessment.openingTime || assessment.closingTime) && (
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs space-y-1">
                                <span className="text-[#EDEDF0] font-medium block">Assessment Window</span>
                                {assessment.openingTime && (
                                    <p className="text-[#8B8B9E]">
                                        Opens: <span className="text-[#EDEDF0]">{new Date(assessment.openingTime).toLocaleString()}</span>
                                    </p>
                                )}
                                {assessment.closingTime && (
                                    <p className="text-[#8B8B9E]">
                                        Expires: <span className="text-amber-400">{new Date(assessment.closingTime).toLocaleString()}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs text-[#8B8B9E] space-y-1">
                            <span className="text-[#EDEDF0] font-medium block">Integrity Notice</span>
                            <p className="text-[11px] leading-relaxed">
                                The session timer begins when you initialize. Code execution and transcripts are automatically preserved across network fluctuations.
                            </p>
                        </div>

                        {/* Checklist */}
                        <div className="space-y-2.5">
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                    <Mic className="w-4 h-4 text-blue-400" />
                                    <span>Microphone Access (Voice Dialogue)</span>
                                </div>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>

                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                    <Volume2 className="w-4 h-4 text-blue-400" />
                                    <span>Audio Output & Speaker</span>
                                </div>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>

                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                    <Cpu className="w-4 h-4 text-blue-400" />
                                    <span>
                                        {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                            ? 'Interactive Architectural Engine'
                                            : 'Online Monaco Sandbox Runner'}
                                    </span>
                                </div>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>

                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-[#EDEDF0]">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    <span>Resume & Project Context</span>
                                </div>
                                {resumeText.trim() ? (
                                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                        Ready
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-[#8B8B9E] px-2 py-0.5 rounded bg-[#1C1C24]">
                                        Optional
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Format summary card */}
                        <div className="p-3.5 bg-[#0A0A0B] border border-[#232330] rounded-lg text-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[#8B8B9E]">Selected Format:</span>
                                <span className="font-medium text-[#EDEDF0]">
                                    {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY'
                                        ? 'Project Architecture Only'
                                        : 'Full Technical Loop'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#8B8B9E]">Live Coding:</span>
                                <span className={interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY' ? 'text-amber-400/90 font-medium' : 'text-emerald-400 font-medium'}>
                                    {interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY' ? 'Skipped (Discussion Only)' : 'Active (Interviewer Led)'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#8B8B9E]">Resume Attached:</span>
                                <span className={resumeText.trim() ? 'text-emerald-400 font-medium' : 'text-[#8B8B9E]'}>
                                    {resumeText.trim() ? 'Yes (Personalized)' : 'No (Standard)'}
                                </span>
                            </div>
                        </div>

                        {/* Launch Action */}
                        <div className="pt-2 space-y-2">
                            <button
                                onClick={handleStartInterview}
                                className="btn-primary w-full py-3"
                            >
                                <span>{assessment.hasInProgressSession ? 'Continue Interview' : 'Start Interview'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <span className="text-[11px] text-[#555568] text-center block">
                                Duration: approximately {assessment.durationMinutes || 30} minutes
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssessmentLobby;
