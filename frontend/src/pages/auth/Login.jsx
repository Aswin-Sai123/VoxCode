import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
    const [role, setRole] = useState('CANDIDATE');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const errorMsg = params.get('error');
        if (errorMsg === 'google_not_configured') {
            return 'Google OAuth credentials not configured on backend. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Render or log in with email/password.';
        } else if (errorMsg === 'account_exists_with_password') {
            return 'An account with this email already exists using password login. Please log in with your email and password.';
        } else if (errorMsg === 'google_failed') {
            return 'Google sign-in was cancelled or failed. Please verify credentials or try again.';
        } else if (errorMsg) {
            return 'OAuth authentication failed. Please enter credentials directly.';
        }
        return '';
    });
    const [isSubmitting, setIsSubmitting] = useState(() => {
        return new URLSearchParams(window.location.search).has('code');
    });

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Catch Google OAuth redirect code or fallback tokens
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const access = params.get('accessToken');
        const refresh = params.get('refreshToken');
        const roleParam = params.get('role') || 'CANDIDATE';

        if (code) {
            api.post('/auth/oauth/exchange', { code })
                .then(res => {
                    const { accessToken, refreshToken, role: returnedRole } = res.data.data;
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);
                    localStorage.setItem('userRole', returnedRole || roleParam);
                    window.location.href = (returnedRole || roleParam) === 'COMPANY' ? '/company/dashboard' : '/candidate/dashboard';
                })
                .catch(err => {
                    setError(err.response?.data?.message || 'OAuth verification failed. Please try again.');
                    setIsSubmitting(false);
                });
            return;
        }

        if (access && refresh) {
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh);
            localStorage.setItem('userRole', roleParam);
            window.location.href = roleParam === 'COMPANY' ? '/company/dashboard' : '/candidate/dashboard';
        }
    }, [location.search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const success = await login(role, email, password);
            if (success) {
                navigate(role === 'COMPANY' ? '/company/dashboard' : '/candidate/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                {/* Left Side: Editorial Branding */}
                <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-6 pr-4">
                    <div key={role} className="space-y-6 transition-all duration-200">
                        {/* Headline & Description */}
                        <div className="space-y-3">
                            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-[#EDEDF0] leading-[1.12]">
                                {role === 'COMPANY'
                                    ? 'Conduct technical rounds with zero recruiter fatigue.'
                                    : 'Take realistic technical rounds through authentic spoken dialogue.'}
                            </h1>
                            <p className="text-sm xl:text-base text-[#8B8B9E] leading-relaxed max-w-xl">
                                {role === 'COMPANY'
                                    ? 'VoxCode pairs candidates with an autonomous lead engineer. From architecture defense to live Monaco execution, screen engineering talent without scheduling bottlenecks.'
                                    : 'VoxCode pairs you with an autonomous tech lead. Talk through real system architecture, solve coding challenges in a live Monaco IDE, and get instant rubric feedback—on your own schedule.'}
                            </p>
                        </div>

                        {/* Key Engineering Pillars */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            {role === 'COMPANY' ? (
                                <>
                                    <div className="p-3.5 rounded-lg bg-[#141419] border border-[#232330] space-y-1">
                                        <span className="text-xs font-semibold text-[#EDEDF0] block">Autonomous Vetting</span>
                                        <span className="text-[11px] text-[#8B8B9E] leading-snug block">Standardized voice rounds that probe deep system design without interviewer burnout.</span>
                                    </div>
                                    <div className="p-3.5 rounded-lg bg-[#141419] border border-[#232330] space-y-1">
                                        <span className="text-xs font-semibold text-[#EDEDF0] block">Live Code Sandbox</span>
                                        <span className="text-[11px] text-[#8B8B9E] leading-snug block">Multi-language sandboxes with automated test verification and code replay.</span>
                                    </div>
                                    <div className="p-3.5 rounded-lg bg-[#141419] border border-[#232330] space-y-1">
                                        <span className="text-xs font-semibold text-[#EDEDF0] block">Instant Rubrics</span>
                                        <span className="text-[11px] text-[#8B8B9E] leading-snug block">Objective, evidence-based candidate scorecards delivered in under 30 seconds.</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-3.5 rounded-lg bg-[#141419] border border-[#232330] space-y-1">
                                        <span className="text-xs font-semibold text-[#EDEDF0] block">Real-Time Voice</span>
                                        <span className="text-[11px] text-[#8B8B9E] leading-snug block">Natural, bidirectional spoken dialogues with sub-100ms response audio.</span>
                                    </div>
                                    <div className="p-3.5 rounded-lg bg-[#141419] border border-[#232330] space-y-1">
                                        <span className="text-xs font-semibold text-[#EDEDF0] block">Live Code Sandbox</span>
                                        <span className="text-[11px] text-[#8B8B9E] leading-snug block">Interactive multi-language Monaco editor with real-time test execution.</span>
                                    </div>
                                    <div className="p-3.5 rounded-lg bg-[#141419] border border-[#232330] space-y-1">
                                        <span className="text-xs font-semibold text-[#EDEDF0] block">Objective Feedback</span>
                                        <span className="text-[11px] text-[#8B8B9E] leading-snug block">Transparent scorecards covering DSA, architecture depth, and code quality.</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Engineering Attribution Footer */}
                        <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#555568] border-t border-[#232330]">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 inline-block" />
                                {role === 'COMPANY' ? 'Zero Scheduling Lag' : 'Real-Time Spoken Audio (< 90ms)'}
                            </span>
                            <span>{role === 'COMPANY' ? 'Objective Rubric Scoring' : 'Interactive Monaco Sandbox'}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Card */}
                <div className="lg:col-span-5 w-full max-w-md mx-auto space-y-6">
                    {/* Brand & Heading */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDF0]">
                            Welcome back
                        </h1>
                        <p className="text-sm text-[#8B8B9E]">
                            Sign in to your VoxCode account
                        </p>
                    </div>

                    {/* Main Card */}
                    <div className="bg-[#141419] border border-[#232330] rounded-xl p-6 sm:p-8 space-y-5 shadow-2xl">
                        {/* Role Selector Pill */}
                        <div className="grid grid-cols-2 p-1 role-pill-container border rounded-lg gap-1">
                            <button
                                type="button"
                                onClick={() => setRole('CANDIDATE')}
                                className={`py-2 text-xs font-semibold rounded-md border transition-all ${
                                    role === 'CANDIDATE'
                                        ? 'role-pill-btn-active'
                                        : 'role-pill-btn-inactive border-transparent'
                                }`}
                            >
                                Candidate
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('COMPANY')}
                                className={`py-2 text-xs font-semibold rounded-md border transition-all ${
                                    role === 'COMPANY'
                                        ? 'role-pill-btn-active'
                                        : 'role-pill-btn-inactive border-transparent'
                                }`}
                            >
                                Recruiter
                            </button>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#8B8B9E] block">
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="studio-input"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-[#8B8B9E]">
                                        Password
                                    </label>
                                    <span className="text-xs text-[#555568]">Min. 6 chars</span>
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="studio-input"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-primary w-full py-2.5 mt-2"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Signing in...</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <span>Sign in</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        </form>

                        {/* Google OAuth (Candidate only) */}
                        {role === 'CANDIDATE' && (
                            <div className="space-y-3 pt-1">
                                <div className="relative flex items-center justify-center">
                                    <div className="border-t auth-divider-line w-full"></div>
                                    <span className="auth-divider-badge px-2 text-[10px] font-mono uppercase absolute">
                                        or continue with
                                    </span>
                                </div>

                                <a
                                    href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')}/auth/google`}
                                    className="studio-btn-secondary w-full py-2.5 flex items-center justify-center gap-2.5 text-xs font-mono font-medium hover:border-[#3F3F46] transition-all"
                                >
                                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                                        <path
                                            fill="#EA4335"
                                            d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                                        />
                                        <path
                                            fill="#4285F4"
                                            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                                        />
                                    </svg>
                                    <span>Sign in with Google</span>
                                </a>
                            </div>
                        )}

                        {/* Quick Demo Access */}
                        <div className="border-t border-[#232330] pt-4 space-y-2">
                            <span className="text-[11px] font-medium text-[#555568] block">
                                Quick demo accounts:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRole('CANDIDATE');
                                        setEmail('sarah.chen@example.com');
                                        setPassword('password123');
                                    }}
                                    className="studio-btn-secondary text-xs py-1.5 justify-start text-left"
                                >
                                    <span className="truncate">Sarah (Candidate)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRole('COMPANY');
                                        setEmail('recruiter@acme.ai');
                                        setPassword('password123');
                                    }}
                                    className="studio-btn-secondary text-xs py-1.5 justify-start text-left"
                                >
                                    <span className="truncate">Recruiter Demo</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Switch */}
                    <p className="text-center text-xs text-[#8B8B9E]">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
