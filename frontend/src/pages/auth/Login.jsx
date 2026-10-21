import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
    const [role, setRole] = useState('CANDIDATE');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Catch Google OAuth redirect tokens
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const access = params.get('accessToken');
        const refresh = params.get('refreshToken');
        const errorMsg = params.get('error');

        if (errorMsg) {
            setError('OAuth authentication failed. Please enter credentials directly.');
        } else if (access && refresh) {
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh);
            window.location.href = '/candidate/dashboard';
        }
    }, [location]);

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
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-6">
                {/* Brand & Heading */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 mb-2">
                        <Terminal className="w-5 h-5" />
                    </div>
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
                    <div className="grid grid-cols-2 p-1 bg-[#0A0A0B] border border-[#232330] rounded-lg gap-1">
                        <button
                            type="button"
                            onClick={() => setRole('CANDIDATE')}
                            className={`py-2 text-xs font-medium rounded-md transition-all ${
                                role === 'CANDIDATE'
                                    ? 'bg-[#1C1C24] text-white shadow-sm border border-[#363645]'
                                    : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
                            }`}
                        >
                            Candidate
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('COMPANY')}
                            className={`py-2 text-xs font-medium rounded-md transition-all ${
                                role === 'COMPANY'
                                    ? 'bg-[#1C1C24] text-white shadow-sm border border-[#363645]'
                                    : 'text-[#8B8B9E] hover:text-[#EDEDF0]'
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
                                <span className="truncate">Acme (Recruiter)</span>
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
    );
};

export default Login;
