import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { 
    Terminal, 
    ArrowRight, 
    Clock, 
    AlertCircle, 
    Layers, 
    FileText, 
    ExternalLink,
    Activity,
    ChevronRight,
    CheckCircle2,
    Sparkles,
    Building2,
    Code2,
    Brain,
    Lock,
    Unlock,
    X,
    Loader2,
    Search,
    Globe,
    Cpu,
    Check,
    FolderGit2,
    Play
} from 'lucide-react';

const POPULAR_COMPANIES = [
    { id: 'google', name: 'Google', badge: 'GOOG', color: '#4285F4' },
    { id: 'amazon', name: 'Amazon', badge: 'AMZN', color: '#FF9900' },
    { id: 'meta', name: 'Meta', badge: 'META', color: '#0668E1' },
    { id: 'microsoft', name: 'Microsoft', badge: 'MSFT', color: '#00A4EF' },
    { id: 'netflix', name: 'Netflix', badge: 'NFLX', color: '#E50914' },
    { id: 'apple', name: 'Apple', badge: 'AAPL', color: '#A2AAAD' },
    { id: 'uber', name: 'Uber', badge: 'UBER', color: '#FFFFFF' },
    { id: 'stripe', name: 'Stripe', badge: 'STRP', color: '#635BFF' }
];

const POPULAR_ROLES = [
    { id: 'sde-1', title: 'SDE-1', badge: 'L3 / E3', defaultLevel: 'Entry' },
    { id: 'sde-2', title: 'SDE-2', badge: 'L4 / E4', defaultLevel: 'Mid' },
    { id: 'senior-sde', title: 'Senior SDE', badge: 'L5 / E5', defaultLevel: 'Senior' },
    { id: 'staff-swe', title: 'Staff Engineer', badge: 'L6 / Staff', defaultLevel: 'Senior' },
    { id: 'fullstack', title: 'Full Stack', badge: 'FULL', defaultLevel: 'Mid' },
    { id: 'backend', title: 'Backend / Systems', badge: 'BACK', defaultLevel: 'Mid' },
    { id: 'frontend', title: 'Frontend / Web', badge: 'FRONT', defaultLevel: 'Mid' },
    { id: 'ai-ml', title: 'AI / Machine Learning', badge: 'AI/ML', defaultLevel: 'Mid' }
];


const LEVELS = [
    { id: 'Entry', label: 'Junior / SDE-1', desc: '0 - 2 yrs (Google L3, Meta E3, Amazon SDE-1)' },
    { id: 'Mid', label: 'Mid-Level / SDE-2', desc: '2 - 5 yrs (Google L4, Meta E4, Amazon SDE-2)' },
    { id: 'Senior', label: 'Senior / Staff (SDE-3+)', desc: '5+ yrs (Google L5/L6, Meta E5, Senior SDE)' }
];

const SCRAPING_STEPS = [
    'Connecting to live web intelligence (Google Search Grounding)...',
    'Scanning recent LeetCode Discuss & Glassdoor posts for this company...',
    'Extracting 2024-2026 real interview questions, rubrics & Big-O constraints...',
    'Calibrating AI Tech Lead persona & Monaco IDE workspace...'
];

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [assessmentCode, setAssessmentCode] = useState('');
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joinError, setJoinError] = useState('');

    // Mock assessment modal state
    const [isMockModalOpen, setIsMockModalOpen] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState('google');
    const [customCompanyName, setCustomCompanyName] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState('sde-2');
    const [customRoleTitle, setCustomRoleTitle] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('Mid');
    const [creatingMock, setCreatingMock] = useState(false);
    const [scrapingStepIndex, setScrapingStepIndex] = useState(0);
    const [mockError, setMockError] = useState('');

    // Resume modal & parsed projects state
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
    const [resumeText, setResumeText] = useState('');
    const [parsedProjects, setParsedProjects] = useState([]);
    const [isSavingResume, setIsSavingResume] = useState(false);
    const [resumeSaveSuccess, setResumeSaveSuccess] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await api.get('/candidate/dashboard');
                if (res.data.success) {
                    setDashboardData(res.data.data);
                }

                // Fetch candidate resume & parsed projects
                const resumeRes = await api.get('/candidate/resume');
                if (resumeRes.data.success && resumeRes.data.data) {
                    setResumeText(resumeRes.data.data.resumeText || '');
                    setParsedProjects(resumeRes.data.data.parsedProjects || []);
                }
            } catch (err) {
                console.error('Failed to load candidate dashboard', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleSaveResume = async () => {
        if (!resumeText.trim()) return;
        setIsSavingResume(true);
        setResumeSaveSuccess(false);
        try {
            const res = await api.post('/candidate/resume', { resumeText: resumeText.trim() });
            if (res.data.success) {
                setParsedProjects(res.data.data?.parsedData?.projects || res.data.data?.candidate?.parsedProjects || []);
                setResumeSaveSuccess(true);
                setTimeout(() => setResumeSaveSuccess(false), 4000);
            }
        } catch (err) {
            console.error('Failed to save resume:', err);
        } finally {
            setIsSavingResume(false);
        }
    };

    // Step cycle timer when creating mock test
    useEffect(() => {
        let interval = null;
        if (creatingMock) {
            setScrapingStepIndex(0);
            interval = setInterval(() => {
                setScrapingStepIndex(prev => (prev < SCRAPING_STEPS.length - 1 ? prev + 1 : prev));
            }, 1800);
        } else {
            setScrapingStepIndex(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [creatingMock]);

    const [startingPractice, setStartingPractice] = useState(false);

    const handleStartPractice = async () => {
        setStartingPractice(true);
        setJoinError('');
        try {
            const res = await api.post('/interview/practice/start');
            if (res.data.success) {
                navigate('/candidate/interview/PRACTICE-MOCK-SESSION');
            }
        } catch (err) {
            setJoinError(err.response?.data?.message || 'Failed to start practice mock session');
        } finally {
            setStartingPractice(false);
        }
    };
    const handleJoin = (e) => {
        if (e) e.preventDefault();
        const code = assessmentCode.trim().toUpperCase();
        if (!code) {
            setJoinError('Please enter a valid assessment code (e.g. ASMT-XXXX-XXXX or MOCK-XXXX-XXXX)');
            return;
        }
        setJoinError('');
        navigate(`/candidate/assessment/${code}`);
    };

    const handleQuickFill = (code) => {
        setAssessmentCode(code);
        setJoinError('');
        navigate(`/candidate/assessment/${code}`);
    };

    const handleCreateMock = async (e) => {
        e.preventDefault();
        setCreatingMock(true);
        setMockError('');

        const finalCompanyName = selectedCompanyId === 'custom' 
            ? (customCompanyName.trim() || 'Tech Organization') 
            : (POPULAR_COMPANIES.find(c => c.id === selectedCompanyId)?.name || 'Google');

        const chosenRoleObj = POPULAR_ROLES.find(r => r.id === selectedRoleId);
        const finalRoleTitle = selectedRoleId === 'custom'
            ? (customRoleTitle.trim() || 'Software Engineer')
            : (chosenRoleObj?.title || 'SDE-2');


        try {
            // Live web scraping is triggered on the backend via Gemini Search Grounding
            const res = await api.post('/candidate/mock-assessment', {
                companyName: finalCompanyName,
                roleTitle: finalRoleTitle,
                experienceLevel: selectedLevel,
                durationMinutes: 30
            });

            if (res.data.success && res.data.data?.assessmentCode) {
                navigate(`/candidate/assessment/${res.data.data.assessmentCode}`);
            } else {
                setMockError('Could not initialize mock assessment. Please try again.');
                setCreatingMock(false);
            }
        } catch (err) {
            console.error('Failed to create mock assessment', err);
            setMockError(err.response?.data?.message || 'Failed to scrape and initialize mock session.');
            setCreatingMock(false);
        }
    };

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

    const stats = dashboardData?.stats || {
        totalInterviews: 0,
        avgScore: 0,
        highestScore: 0,
        bestVerdict: 'N/A'
    };

    const recentReports = dashboardData?.recentReports || [];
    const inProgressSessions = dashboardData?.inProgressSessions || [];
    const availableAssessments = dashboardData?.availableAssessments || [];

    const activeCompany = POPULAR_COMPANIES.find(c => c.id === selectedCompanyId);
    const activeRole = POPULAR_ROLES.find(r => r.id === selectedRoleId);
    const currentRoleLabel = selectedRoleId === 'custom' ? (customRoleTitle || 'your custom role') : (activeRole?.title || 'SDE-2');


    return (
        <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232330]">
                <div>
                    <h1 className="text-2xl font-semibold text-[#EDEDF0] tracking-tight">
                        Candidate Studio
                    </h1>
                    <p className="text-sm text-[#8B8B9E] mt-1">
                        Welcome back, {user?.name || 'Candidate'}. Practice with live web-scraped company interview archives or join official assessments.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsResumeModalOpen(true)}
                        className="studio-btn-secondary text-xs flex items-center gap-1.5"
                        title="Add and auto-parse your resume projects for AI interviews"
                    >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Resume & Projects {parsedProjects.length > 0 && `(${parsedProjects.length})`}</span>
                    </button>
                    <button
                        onClick={() => setIsMockModalOpen(true)}
                        className="btn-primary text-xs py-2 px-4 shadow-sm"
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Start Mock Interview</span>
                    </button>
                    <button
                        onClick={handleStartPractice}
                        disabled={startingPractice}
                        className="studio-btn-primary bg-[#10B981] hover:bg-[#059669] text-[#09090B] font-semibold text-xs flex items-center gap-1.5"
                    >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{startingPractice ? 'Starting...' : 'Practice Lab'}</span>
                    </button>
                    <Link to="/candidate/reports" className="studio-btn-secondary text-xs">
                        <FileText className="w-4 h-4 text-[#8B8B9E]" />
                        <span>My reports</span>
                    </Link>
                </div>
            </div>

            {/* In-Progress Session Resume Banner (if any) */}
            {inProgressSessions.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-[#EDEDF0]">
                                    Active Session: {inProgressSessions[0].assessmentTitle || 'Technical Interview'}
                                </p>
                                {inProgressSessions[0].isPractice && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Practice
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-[#8B8B9E] mt-0.5">
                                Code: {inProgressSessions[0].assessmentCode} • Current stage: {inProgressSessions[0].stage}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/candidate/interview/${inProgressSessions[0].assessmentCode}`)}
                        className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    >
                        <span>Resume session</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* 2 Main Action Cards: Real-Time Scraped Mock Studio vs Join Official Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Real-Time Scraped Mock Assessment Studio Card */}
                <div className="bg-[#141419] border border-blue-500/30 hover:border-blue-500/50 transition-all rounded-xl p-6 relative overflow-hidden flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                                <Globe className="w-3 h-3" />
                                <span>Live Web-Scraped Interview Data</span>
                            </span>
                            <span className="text-[11px] font-mono text-[#8B8B9E]">Real Questions</span>
                        </div>
                        <h2 className="text-lg font-semibold text-[#EDEDF0]">
                            Live Mock Interview Studio
                        </h2>
                        <p className="text-xs text-[#8B8B9E] leading-relaxed">
                            Simulate real interviews powered by live web search across LeetCode Discuss, Glassdoor, and Blind for any company and role. Get transparent scorecards, Big-O complexity feedback, and improvement vectors.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {POPULAR_COMPANIES.slice(0, 5).map(c => (
                            <span key={c.id} className="px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330] text-[11px] font-mono text-[#8B8B9E]">
                                {c.badge}
                            </span>
                        ))}
                        <span className="text-xs text-[#555568]">+Any Company</span>
                    </div>

                    <button
                        onClick={() => setIsMockModalOpen(true)}
                        className="btn-primary w-full py-2.5 text-xs font-medium mt-2"
                    >
                        <Search className="w-3.5 h-3.5" />
                        <span>Scrape & Launch Mock Assessment</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                    </button>
                </div>

                {/* 2. Official Company Assessment Card */}
                <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                <Lock className="w-3 h-3" />
                                <span>Confidential to Recruiter</span>
                            </span>
                            <span className="text-[11px] font-mono text-[#8B8B9E]">Hiring Test</span>
                        </div>
                        <h2 className="text-lg font-semibold text-[#EDEDF0]">
                            Join an Official Assessment
                        </h2>
                        <p className="text-xs text-[#8B8B9E] leading-relaxed">
                            Invited by an employer or hiring team? Enter your assessment invitation code below. Official evaluations are confidential and submitted directly to the company recruiter.
                        </p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={assessmentCode}
                                onChange={(e) => {
                                    setAssessmentCode(e.target.value.toUpperCase());
                                    if (joinError) setJoinError('');
                                }}
                                placeholder="ASMT-XXXX-XXXX"
                                className="studio-input font-mono uppercase tracking-wider text-xs flex-1"
                            />
                            <button
                                type="submit"
                                className="studio-btn-secondary px-4 py-2 text-xs font-medium whitespace-nowrap"
                            >
                                Join Lobby
                            </button>
                        </div>
                        {joinError && (
                            <p className="text-xs text-red-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{joinError}</span>
                            </p>
                        )}
                    </form>
                </div>
            </div>

            {/* Top Telemetry Strip: 4-Column Connected Metric Bar */}
            <div className="border border-[#232330] bg-[#141419] rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#232330] overflow-hidden">
                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
                        Interviews done
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                            {stats.totalInterviews}
                        </span>
                        <span className="text-xs text-[#555568]">total</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
                        Average score
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                            {stats.avgScore}%
                        </span>
                        <span className="text-xs text-emerald-400 font-medium">overall</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
                        Best score
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-semibold text-[#EDEDF0] tabular-nums tracking-tight">
                            {stats.highestScore}%
                        </span>
                        <span className="text-xs text-[#555568]">top score</span>
                    </div>
                </div>

                <div className="p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
                        Code runners
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-sm font-mono font-medium text-emerald-400">
                            Ready
                        </span>
                        <span className="text-[11px] font-mono text-[#555568]">0.18s</span>
                    </div>
                </div>
            </div>

            {/* Active Assessment Queue */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#8B8B9E]" />
                        <h2 className="text-sm font-semibold text-[#EDEDF0]">
                            Available Assessments
                        </h2>
                    </div>
                    <span className="text-xs text-[#555568]">
                        {availableAssessments.length} available
                    </span>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl overflow-hidden divide-y divide-[#232330]">
                    {availableAssessments.length > 0 ? (
                        availableAssessments.map((asmt) => {
                            const isMock = asmt.assessmentType === 'MOCK';
                            const compName = asmt.targetCompanyName || asmt.companyName || asmt.company?.name || 'Company';
                            const rTitle = asmt.targetRoleTitle || asmt.roleTitle || asmt.role?.title || 'Software Engineer';

                            return (
                                <div
                                    key={asmt._id}
                                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#1C1C24]/60 transition-colors"
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="text-sm font-medium text-[#EDEDF0]">
                                                {asmt.title || `${compName} ${rTitle}`}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#0A0A0B] text-[#8B8B9E] border border-[#232330]">
                                                {compName}
                                            </span>
                                            {isMock ? (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    Live Mock
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    Official Test
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-[#8B8B9E] flex-wrap">
                                            <span className="font-mono text-[11px] text-[#EDEDF0]">
                                                {asmt.assessmentCode}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-[#555568]" />
                                                <span>{asmt.durationMinutes || 30} mins</span>
                                            </span>
                                            <span>•</span>
                                            <span>
                                                Skills: {(asmt.skills || ['DSA', 'System Architecture']).slice(0, 3).join(', ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleQuickFill(asmt.assessmentCode)}
                                            className="btn-primary text-xs py-2 px-4"
                                        >
                                            <span>{isMock ? 'Practice now' : 'Start assessment'}</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center space-y-1">
                            <p className="text-sm text-[#8B8B9E]">No active sessions found.</p>
                            <p className="text-xs text-[#555568]">Click "Start Mock Interview" above to scrape and launch a practice session.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Results Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#8B8B9E]" />
                        <h2 className="text-sm font-semibold text-[#EDEDF0]">
                            Recent Results & History
                        </h2>
                    </div>
                    <Link to="/candidate/reports" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium">
                        <span>View all reports</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="bg-[#141419] border border-[#232330] rounded-xl overflow-hidden">
                    {recentReports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-[#232330] bg-[#0A0A0B]/60 text-[#8B8B9E] text-xs font-medium">
                                        <th className="py-3 px-5">Assessment</th>
                                        <th className="py-3 px-5">Type</th>
                                        <th className="py-3 px-5">Organization</th>
                                        <th className="py-3 px-5">Score</th>
                                        <th className="py-3 px-5">Verdict / Status</th>
                                        <th className="py-3 px-5 text-right">Report Access</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#232330]">
                                    {recentReports.map((report) => (
                                        <tr key={report._id} className="hover:bg-[#1C1C24]/60 transition-colors">
                                            <td className="py-4 px-5">
                                                <div className="font-medium text-[#EDEDF0]">
                                                    {report.assessmentTitle || 'Technical Interview'}
                                                </div>
                                                <span className="text-xs text-[#555568]">
                                                    {new Date(report.createdAt).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                {report.isMock ? (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        Live Mock
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        Official Test
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5 text-xs text-[#8B8B9E]">
                                                {report.companyName}
                                            </td>
                                            <td className="py-4 px-5">
                                                {report.isMock ? (
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
                                                {report.isMock ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVerdictBadge(report.verdict)}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        <span>{report.verdict || 'Completed'}</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                                                        <span>Delivered to Recruiter</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                {report.isMock ? (
                                                    <Link
                                                        to={`/candidate/report/${report.sessionId || report.session?._id || report.session}`}
                                                        className="studio-btn-secondary text-xs py-1.5 px-3"
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center space-y-1">
                            <p className="text-sm text-[#8B8B9E]">No interview records found.</p>
                            <p className="text-xs text-[#555568]">Complete your first mock or official interview to view performance history.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mock Assessment Creation Modal */}
            {isMockModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#141419] border border-[#232330] rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-[#232330]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-[#EDEDF0]">
                                        Live Web-Scraped Mock Assessment
                                    </h3>
                                    <p className="text-xs text-[#8B8B9E]">
                                        Searches LeetCode Discuss & Glassdoor live for authentic 2024–2026 questions
                                    </p>
                                </div>
                            </div>
                            {!creatingMock && (
                                <button
                                    onClick={() => setIsMockModalOpen(false)}
                                    className="text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Loading / Web Scraping Animation Screen */}
                        {creatingMock ? (
                            <div className="py-12 px-6 flex flex-col items-center justify-center space-y-6 text-center animate-fade-in">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin flex items-center justify-center"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-blue-400">
                                        <Search className="w-6 h-6 animate-pulse" />
                                    </div>
                                </div>

                                <div className="space-y-2 max-w-md">
                                    <h4 className="text-base font-semibold text-[#EDEDF0] tracking-tight">
                                        Scraping Live Interview Archives...
                                    </h4>
                                    <p className="text-xs text-blue-400 font-mono transition-all duration-300">
                                        {SCRAPING_STEPS[scrapingStepIndex]}
                                    </p>
                                </div>

                                {/* Multi-step checkmarks */}
                                <div className="w-full max-w-sm space-y-2 pt-4 border-t border-[#232330] text-left">
                                    {SCRAPING_STEPS.map((step, idx) => {
                                        const isDone = idx < scrapingStepIndex;
                                        const isCurrent = idx === scrapingStepIndex;

                                        return (
                                            <div key={idx} className="flex items-center gap-2.5 text-xs">
                                                {isDone ? (
                                                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                                        <Check className="w-2.5 h-2.5" />
                                                    </span>
                                                ) : isCurrent ? (
                                                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 animate-spin">
                                                        <Loader2 className="w-2.5 h-2.5" />
                                                    </span>
                                                ) : (
                                                    <span className="w-4 h-4 rounded-full bg-[#1C1C24] text-[#555568] flex items-center justify-center flex-shrink-0 text-[10px]">
                                                        {idx + 1}
                                                    </span>
                                                )}
                                                <span className={isDone ? 'text-[#8B8B9E] line-through' : isCurrent ? 'text-[#EDEDF0] font-medium' : 'text-[#555568]'}>
                                                    {step}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateMock} className="space-y-5">
                                {/* Company Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#EDEDF0] block">
                                        Target Company
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {POPULAR_COMPANIES.map((company) => (
                                            <button
                                                type="button"
                                                key={company.id}
                                                onClick={() => setSelectedCompanyId(company.id)}
                                                className={`p-3 rounded-lg border text-left transition-all ${
                                                    selectedCompanyId === company.id
                                                        ? 'border-blue-500 bg-blue-500/10 text-white'
                                                        : 'border-[#232330] bg-[#0A0A0B] text-[#8B8B9E] hover:border-[#383848]'
                                                }`}
                                            >
                                                <span className="font-mono text-xs font-semibold block text-[#EDEDF0]">
                                                    {company.badge}
                                                </span>
                                                <span className="text-xs mt-0.5 block truncate">
                                                    {company.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedCompanyId('custom')}
                                        className={`w-full p-2.5 mt-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                                            selectedCompanyId === 'custom'
                                                ? 'border-blue-500 bg-blue-500/10 text-white'
                                                : 'border-[#232330] bg-[#0A0A0B] text-[#8B8B9E] hover:border-[#383848]'
                                        }`}
                                    >
                                        <span>Other / Custom Organization (e.g. Airbnb, Coinbase, Datadog)</span>
                                        <Building2 className="w-4 h-4 text-[#8B8B9E]" />
                                    </button>

                                    {selectedCompanyId === 'custom' && (
                                        <input
                                            type="text"
                                            value={customCompanyName}
                                            onChange={(e) => setCustomCompanyName(e.target.value)}
                                            placeholder="Enter exact company name"
                                            className="studio-input text-xs mt-2"
                                            required
                                        />
                                    )}
                                </div>

                                {/* Role Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#EDEDF0] block">
                                        Target Engineering Role
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {POPULAR_ROLES.map((role) => (
                                            <button
                                                type="button"
                                                key={role.id}
                                                onClick={() => {
                                                    setSelectedRoleId(role.id);
                                                    if (role.defaultLevel) setSelectedLevel(role.defaultLevel);
                                                }}
                                                className={`p-3 rounded-lg border text-left transition-all ${
                                                    selectedRoleId === role.id
                                                        ? 'border-blue-500 bg-blue-500/10 text-white'
                                                        : 'border-[#232330] bg-[#0A0A0B] text-[#8B8B9E] hover:border-[#383848]'
                                                }`}
                                            >
                                                <span className="font-mono text-xs font-semibold block text-[#EDEDF0]">
                                                    {role.badge}
                                                </span>
                                                <span className="text-xs mt-0.5 block truncate">
                                                    {role.title}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedRoleId('custom')}
                                        className={`w-full p-2.5 mt-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                                            selectedRoleId === 'custom'
                                                ? 'border-blue-500 bg-blue-500/10 text-white'
                                                : 'border-[#232330] bg-[#0A0A0B] text-[#8B8B9E] hover:border-[#383848]'
                                        }`}
                                    >
                                        <span>Other / Custom Engineering Role (e.g. iOS Developer, Data Platform, Security)</span>
                                        <Code2 className="w-4 h-4 text-[#8B8B9E]" />
                                    </button>

                                    {selectedRoleId === 'custom' && (
                                        <input
                                            type="text"
                                            value={customRoleTitle}
                                            onChange={(e) => setCustomRoleTitle(e.target.value)}
                                            placeholder="Enter exact role title (e.g. Senior iOS Developer, Data Platform Engineer)"
                                            className="studio-input text-xs mt-2"
                                            required
                                        />
                                    )}
                                </div>


                                {/* Experience Level */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#EDEDF0] block">
                                        Candidate Seniority Level
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {LEVELS.map((lvl) => (
                                            <button
                                                type="button"
                                                key={lvl.id}
                                                onClick={() => setSelectedLevel(lvl.id)}
                                                className={`p-2.5 rounded-lg border text-left transition-all ${
                                                    selectedLevel === lvl.id
                                                        ? 'border-blue-500 bg-blue-500/10 text-white'
                                                        : 'border-[#232330] bg-[#0A0A0B] text-[#8B8B9E] hover:border-[#383848]'
                                                }`}
                                            >
                                                <span className="text-xs font-medium block text-[#EDEDF0]">
                                                    {lvl.label}
                                                </span>
                                                <span className="text-[11px] text-[#555568] block mt-0.5">
                                                    {lvl.desc}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Resume Context Indicator */}
                                <div className="bg-[#0A0A0B] border border-[#232330] rounded-lg p-3 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <div>
                                            <span className="text-[#EDEDF0] font-medium block">
                                                Resume Project Deep Dive
                                            </span>
                                            <span className="text-[11px] text-[#8B8B9E]">
                                                {parsedProjects.length > 0 
                                                    ? `${parsedProjects.length} project(s) parsed & ready for architectural probing` 
                                                    : 'No resume attached yet (optional)'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsResumeModalOpen(true)}
                                        className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1"
                                    >
                                        {parsedProjects.length > 0 ? 'Edit' : 'Add Resume'}
                                    </button>
                                </div>

                                {/* Scraped Intelligence Pipeline Notice */}
                                <div className="bg-[#0A0A0B] border border-[#232330] rounded-lg p-3.5 space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between text-[#EDEDF0] font-medium">
                                        <span className="flex items-center gap-2">
                                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                                            <span>Real-Time Web Scraper Enabled</span>
                                        </span>
                                        <span className="font-mono text-[11px] text-emerald-400">
                                            2024–2026 Archive
                                        </span>
                                    </div>
                                    <p className="text-[#8B8B9E] text-[11px] leading-relaxed">
                                        When you click launch, VoxCode queries live search grounding across LeetCode Discuss, Glassdoor, and Blind for authentic questions asked at {selectedCompanyId === 'custom' ? (customCompanyName || 'your chosen company') : activeCompany?.name} for {currentRoleLabel}.
                                    </p>

                                </div>

                                {mockError && (
                                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{mockError}</span>
                                    </p>
                                )}

                                {/* Modal Actions */}
                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232330]">
                                    <button
                                        type="button"
                                        onClick={() => setIsMockModalOpen(false)}
                                        className="studio-btn-secondary text-xs py-2 px-4"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary text-xs py-2 px-5"
                                    >
                                        <Search className="w-3.5 h-3.5" />
                                        <span>Scrape & Launch Mock</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Resume & Project Context Modal */}
            {isResumeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#141419] border border-[#232330] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between pb-3 border-b border-[#232330]">
                            <div className="space-y-1">
                                <h2 className="text-base font-semibold text-[#EDEDF0] flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    <span>Resume & Project Context</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        <span>LLM Powered</span>
                                    </span>
                                </h2>
                                <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                    Paste your resume or project highlights. The AI interviewer uses this to discuss your real-world architecture, tech stack, and trade-offs in both mock and real rounds.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsResumeModalOpen(false)}
                                className="text-[#8B8B9E] hover:text-[#EDEDF0] p-1 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-medium text-[#EDEDF0] block">
                                Resume Text or Project Highlights
                            </label>
                            <textarea
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                                rows={6}
                                placeholder="Paste your resume summary, LinkedIn profile, or key project details here (e.g. 'Built an event-driven payment processing pipeline using Kafka, Node.js microservices, and PostgreSQL handling 50k transactions/sec...')"
                                className="w-full bg-[#0A0A0B] border border-[#232330] rounded-xl p-3.5 text-xs text-[#EDEDF0] placeholder-[#555568] focus:outline-none focus:border-emerald-500/50 leading-relaxed font-sans resize-y"
                            />

                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleSaveResume}
                                    disabled={isSavingResume || !resumeText.trim()}
                                    className="studio-btn-secondary px-4 py-2 text-xs flex items-center gap-2 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                                >
                                    {isSavingResume ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Extracting Projects with Gemini...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Auto-Parse & Save Projects</span>
                                        </>
                                    )}
                                </button>

                                {resumeSaveSuccess && (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Saved & parsed successfully!</span>
                                    </span>
                                )}
                            </div>

                            {/* Parsed Projects Display */}
                            {parsedProjects.length > 0 && (
                                <div className="pt-3 space-y-2 border-t border-[#232330]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B8B9E] block">
                                        Parsed Projects for AI Discussion ({parsedProjects.length})
                                    </span>
                                    <div className="space-y-2">
                                        {parsedProjects.map((p, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-lg space-y-1 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-[#EDEDF0] flex items-center gap-1.5">
                                                        <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span>{p.title}</span>
                                                    </span>
                                                    {p.techStack && p.techStack.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {p.techStack.slice(0, 4).map((tech, ti) => (
                                                                <span
                                                                    key={ti}
                                                                    className="px-1.5 py-0.5 rounded bg-[#1C1C24] text-[10px] text-[#8B8B9E] border border-[#232330]"
                                                                >
                                                                    {tech}
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

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232330]">
                            <button
                                type="button"
                                onClick={() => setIsResumeModalOpen(false)}
                                className="btn-primary text-xs py-2 px-5"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
