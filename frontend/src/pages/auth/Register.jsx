import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

const Register = () => {
    const [role, setRole] = useState('CANDIDATE');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const success = await register(role, name, email, password);
            if (success) {
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please check form inputs.');
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
                        Create your account
                    </h1>
                    <p className="text-sm text-[#8B8B9E]">
                        Start taking or hosting technical assessments
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

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#8B8B9E] block">
                                {role === 'COMPANY' ? 'Company or team name' : 'Full name'}
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={role === 'COMPANY' ? 'Acme Labs' : 'Alex Mercer'}
                                className="studio-input"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#8B8B9E] block">
                                Work or personal email
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
                                minLength={6}
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
                                    <span>Creating account...</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <span>Create account</span>
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </button>
                    </form>
                    {role === 'CANDIDATE' && (
                        <div className="space-y-3 pt-1">
                            <div className="relative flex items-center justify-center">
                                <div className="border-t auth-divider-line w-full"></div>
                                <span className="auth-divider-badge px-2 text-[10px] font-mono uppercase absolute">
                                    or sign up with
                                </span>
                            </div>

                            <a
                                href="http://localhost:5000/api/auth/google"
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
                                <span>Sign up with Google</span>
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer Switch */}
                <p className="text-center text-xs text-[#8B8B9E]">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
