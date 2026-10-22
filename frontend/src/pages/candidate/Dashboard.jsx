import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    ArrowRight, 
    Clock, 
    AlertCircle, 
    Layers, 
    ExternalLink,
    Activity,
    ChevronRight,
    CheckCircle2,
    Building2,
    Code2,
    Lock,
    X,
    Loader2,
    Search,
    Globe,
    Check,
    FileText,
    UploadCloud
} from 'lucide-react';
import SpotlightCard from '../../components/common/SpotlightCard';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import CopyButton from '../../components/common/CopyButton';
import { toast } from 'sonner';

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
    'Searching the web for real interview questions...',
    'Finding recent questions from LeetCode, Glassdoor & more...',
    'Building your personalized interview based on real data...',
    'Setting up your interview room...'
];

const Dashboard = () => {
    const navigate = useNavigate();
    const [assessmentCode, setAssessmentCode] = useState('');
    const [dashboardData, setDashboardData] = useState(null);
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
    const [savedResume, setSavedResume] = useState(null);
    const [isUploadingResume, setIsUploadingResume] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await api.get('/candidate/dashboard');
                if (res.data.success) {
                    setDashboardData(res.data.data);
                    const cand = res.data.data?.candidate;
                    if (cand && (cand.resumeFileName || cand.resumeText)) {
                        setSavedResume({
                            fileName: cand.resumeFileName || 'Saved_Resume.pdf',
                            projectsCount: (cand.parsedProjects || []).length,
                            summary: cand.resumeText?.slice(0, 200) || ''
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to load candidate dashboard', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleDashboardResumeUpload = async (file) => {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            toast.error('File size exceeds 20MB limit. Please upload a smaller resume document.');
            return;
        }

        setIsUploadingResume(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Content = reader.result;
                const mimeType = file.type || 'application/pdf';
                const res = await api.post('/candidate/resume/upload', {
                    fileBase64: base64Content,
                    mimeType,
                    fileName: file.name
                });
                if (res.data.success) {
                    const data = res.data.data;
                    setSavedResume({
                        fileName: data.fileName || file.name,
                        projectsCount: (data.projects || []).length,
                        summary: data.summary
                    });
                    toast.success('Resume parsed and contextualized with Gemini');
                }
                setIsUploadingResume(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Failed to parse resume document:', err);
            toast.error(err.response?.data?.message || 'Failed to upload and parse resume document.');
            setIsUploadingResume(false);
        }
    };

    // Step cycle timer when creating mock test
    useEffect(() => {
        if (!creatingMock) return;
        const interval = setInterval(() => {
            setScrapingStepIndex(prev => (prev < SCRAPING_STEPS.length - 1 ? prev + 1 : prev));
        }, 1800);
        return () => clearInterval(interval);
    }, [creatingMock]);

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
        setScrapingStepIndex(0);
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

    const recentReports = (dashboardData?.recentReports || []).filter(
        r => r.assessmentCode !== 'PRACTICE-MOCK-SESSION' && r.assessmentTitle !== 'Technical Practice Mock Interview'
    );
    const inProgressSessions = (dashboardData?.inProgressSessions || []).filter(
        s => s.assessmentCode !== 'PRACTICE-MOCK-SESSION'
    );
    const availableAssessments = (dashboardData?.availableAssessments || []).filter(
        a => a.assessmentCode !== 'PRACTICE-MOCK-SESSION'
    );
    const completedAssessmentCodes = dashboardData?.completedAssessmentCodes || [];

    const activeCompany = POPULAR_COMPANIES.find(c => c.id === selectedCompanyId);
    const activeRole = POPULAR_ROLES.find(r => r.id === selectedRoleId);
    const currentRoleLabel = selectedRoleId === 'custom' ? (customRoleTitle || 'your custom role') : (activeRole?.title || 'SDE-2');


    if (loading && !dashboardData) {
        return (
            <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <CardSkeleton className="h-64" />
                    <CardSkeleton className="h-64" />
                </div>
                <div className="border border-[#232330] bg-[#141419] rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#232330] p-4 gap-4">
                    <CardSkeleton className="h-20" />
                    <CardSkeleton className="h-20" />
                    <CardSkeleton className="h-20" />
                    <CardSkeleton className="h-20" />
                </div>
                <TableSkeleton rows={4} />
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">


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
                        className="btn-warning text-xs py-2 px-4 whitespace-nowrap"
                    >
                        <span>Resume session</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* 2 Main Action Cards: Real-Time Scraped Mock Studio vs Join Official Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Real-Time Scraped Mock Assessment Studio Card */}
                <SpotlightCard
                    spotlightColor="rgba(59, 130, 246, 0.15)"
                    className="p-6 flex flex-col justify-between space-y-4 border-blue-500/30 hover:border-blue-500/60"
                >
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                <Globe className="w-3 h-3" />
                                <span>Live Interview Questions</span>
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8B9E]">Real Questions</span>
                        </div>
                        <h2 className="text-lg font-semibold metallic-heading">
                            Mock Interview
                        </h2>
                        <p className="text-xs text-[#8B8B9E] leading-relaxed">
                            Practice with real interview questions from any company. Get detailed feedback and scores to help you improve.
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
                        className="btn-primary w-full py-2.5 text-xs font-medium mt-2 active:scale-[0.98] transition-transform duration-100"
                    >
                        <Search className="w-3.5 h-3.5" />
                        <span>Start Mock Interview</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                    </button>
                </SpotlightCard>

                {/* 2. Official Company Assessment Card */}
                <SpotlightCard
                    spotlightColor="rgba(16, 185, 129, 0.15)"
                    className="p-6 flex flex-col justify-between space-y-4 border-emerald-500/30 hover:border-emerald-500/60"
                >
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <Lock className="w-3 h-3" />
                                <span>Confidential to Recruiter</span>
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B8B9E]">Hiring Test</span>
                        </div>
                        <h2 className="text-lg font-semibold metallic-heading">
                            Join an Official Assessment
                        </h2>
                        <p className="text-xs text-[#8B8B9E] leading-relaxed">
                            Got an invite code from a company? Enter it below to start your official assessment. Results go directly to the hiring team.
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
                                className="btn-primary px-4 py-2 text-xs font-medium whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-transform duration-100 flex items-center gap-1.5"
                            >
                                <span>Join Lobby</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {joinError && (
                            <p className="text-xs text-red-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{joinError}</span>
                            </p>
                        )}
                    </form>
                </SpotlightCard>
            </div>

            {/* Top Telemetry Strip: 4-Column Connected Metric Bar */}
            <div className="border border-[#232330] bg-[#141419] rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#232330] overflow-hidden light-catch">
                <div className="p-4 space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
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
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
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
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
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
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B8B9E] block">
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
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                    <span>Live Mock</span>
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                    <span>Official Test</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-[#8B8B9E] flex-wrap">
                                            <CopyButton textToCopy={asmt.assessmentCode} successMessage={`Copied ${asmt.assessmentCode} to clipboard`} />
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
                                        {completedAssessmentCodes.includes(asmt.assessmentCode) ? (
                                            <Link
                                                to="/candidate/reports"
                                                className="studio-btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 text-emerald-400 border-emerald-500/30"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Completed • View Report</span>
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={() => handleQuickFill(asmt.assessmentCode)}
                                                className="btn-primary text-xs py-2 px-4"
                                            >
                                                <span>{isMock ? 'Practice now' : 'Start assessment'}</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <EmptyState
                            title="No assessments in queue"
                            description="Launch an AI practice session or enter an official company code above to begin."
                            actionLabel="Start Mock Interview"
                            onAction={() => setIsMockModalOpen(true)}
                            actionIcon={Search}
                        />
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
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
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
                        <EmptyState
                            title="No interview records found"
                            description="Complete your first mock or official interview to view comprehensive evaluation scorecards."
                            actionLabel="Start Mock Interview"
                            onAction={() => setIsMockModalOpen(true)}
                            actionIcon={Search}
                        />
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
                                        Mock Interview Setup
                                    </h3>
                                    <p className="text-xs text-[#8B8B9E]">
                                        Practice with real questions from any company
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
                                        Finding real interview questions...
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
                                                        ? 'mock-selector-btn-active'
                                                        : 'mock-selector-btn-inactive'
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
                                                ? 'mock-selector-btn-active'
                                                : 'mock-selector-btn-inactive'
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
                                                        ? 'mock-selector-btn-active'
                                                        : 'mock-selector-btn-inactive'
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
                                                ? 'mock-selector-btn-active'
                                                : 'mock-selector-btn-inactive'
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
                                                        ? 'mock-selector-btn-active'
                                                        : 'mock-selector-btn-inactive'
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

                                {/* Resume / Project Context (Optional Upload) */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-[#EDEDF0] flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Resume & Project Context</span>
                                        </label>
                                        {savedResume?.fileName ? (
                                            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Gemini Ready</span>
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-[#8B8B9E] px-2 py-0.5 rounded bg-[#0A0A0B] border border-[#232330]">
                                                Optional • Can also upload in lobby
                                            </span>
                                        )}
                                    </div>

                                    {savedResume?.fileName ? (
                                        <div className="p-3 bg-[#0A0A0B] border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[#EDEDF0] truncate font-medium">{savedResume.fileName}</p>
                                                    <p className="text-[11px] text-[#8B8B9E]">
                                                        {savedResume.projectsCount > 0 
                                                            ? `${savedResume.projectsCount} technical project${savedResume.projectsCount > 1 ? 's' : ''} extracted` 
                                                            : 'Extracted with Gemini for interview deep-dive'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById('dashboard-modal-resume-file')?.click()}
                                                    className="studio-btn-secondary text-[11px] py-1 px-2.5 text-emerald-400 hover:text-emerald-300"
                                                >
                                                    Replace
                                                </button>
                                                <input
                                                    id="dashboard-modal-resume-file"
                                                    type="file"
                                                    accept=".pdf,.docx,.doc,.txt"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handleDashboardResumeUpload(e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => document.getElementById('dashboard-modal-resume-file')?.click()}
                                            className="p-3.5 border border-dashed border-[#232330] hover:border-emerald-500/40 rounded-lg bg-[#0A0A0B]/60 text-center cursor-pointer transition-all group"
                                        >
                                            <input
                                                id="dashboard-modal-resume-file"
                                                type="file"
                                                accept=".pdf,.docx,.doc,.txt"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleDashboardResumeUpload(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                            {isUploadingResume ? (
                                                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 animate-pulse">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Gemini is parsing resume projects & architecture...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 text-xs text-[#8B8B9E] group-hover:text-[#EDEDF0]">
                                                    <UploadCloud className="w-4 h-4 text-emerald-400" />
                                                    <span>Upload resume (PDF, DOCX, TXT) to customize questions to your real projects</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Scraped Intelligence Pipeline Notice */}
                                <div className="bg-[#0A0A0B] border border-[#232330] rounded-lg p-3.5 space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between text-[#EDEDF0] font-medium">
                                        <span className="flex items-center gap-2">
                                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                                            <span>Real Questions Included</span>
                                        </span>
                                        <span className="font-mono text-[11px] text-emerald-400">
                                            2024–2026 Archive
                                        </span>
                                    </div>
                                    <p className="text-[#8B8B9E] text-[11px] leading-relaxed">
                                        When you start, we'll search for real interview questions asked at {selectedCompanyId === 'custom' ? (customCompanyName || 'your chosen company') : activeCompany?.name} for {currentRoleLabel}.
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
                                        <span>Start Mock Interview</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}


        </div>
    );
};

export default Dashboard;
