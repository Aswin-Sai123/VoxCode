import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Terminal, Shield, ArrowRight, Activity, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

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
        <div className="flex-1 flex min-h-[calc(100vh-48px)] bg-[#09090B]">
            {/* Left Pane: Technical Evaluation Telemetry Showcase */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#09090B] bg-grid-studio border-r border-[#222228] p-12 flex-col justify-between overflow-hidden">
                {/* Header Tag */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm bg-[#10B981]"></span>
                        <span className="font-mono text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                            VoxCode // Autonomous Evaluation Studio
                        </span>
                    </div>
                    <span className="studio-badge bg-[#111114] text-[#10B981] border-[#10B981]/30">
                        [SYS.READY]
                    </span>
                </div>

                {/* Main Architectural Showcase Card */}
                <div className="max-w-md w-full bg-[#111114] border border-[#222228] rounded-md p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#10B981]" />
                            <span className="font-mono text-xs text-[#FAFAFA] font-medium uppercase">
                                Telemetry Dossier // Live Session
                            </span>
                        </div>
                        <span className="font-mono text-[11px] text-[#52525B]">ID-8842-AX</span>
                    </div>

                    {/* Acoustic Waveform Simulation */}
                    <div className="bg-[#09090B] border border-[#222228] rounded p-3.5 space-y-2">
                        <div className="flex justify-between text-[11px] font-mono text-[#71717A]">
                            <span>AUDIO.TRANSCEIVER // 48kHz PCM</span>
                            <span className="text-[#10B981]">ACTIVE [ROHAN]</span>
                        </div>
                        <div className="flex items-center gap-1.5 h-7">
                            {[14, 26, 18, 32, 22, 10, 28, 20, 36, 16, 24, 12, 30, 22, 18, 28].map((h, i) => (
                                <span
                                    key={i}
                                    style={{ height: `${h}px` }}
                                    className="flex-1 bg-[#10B981]/70 rounded-sm animate-pulse"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Polyglot Compiler Sandbox Telemetry */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-[#09090B] border border-[#222228] rounded p-2.5 space-y-1">
                            <span className="text-[10px] text-[#52525B] uppercase block">Runtime Sandbox</span>
                            <span className="text-[#FAFAFA] font-medium">Node.js 24 / C++ GCC</span>
                            <span className="text-[10px] text-[#10B981] block">0.20s execution latency</span>
                        </div>
                        <div className="bg-[#09090B] border border-[#222228] rounded p-2.5 space-y-1">
                            <span className="text-[10px] text-[#52525B] uppercase block">Algorithmic Grade</span>
                            <span className="text-[#FAFAFA] font-medium">O(N log N) Optimal</span>
                            <span className="text-[10px] text-[#A1A1AA] block">4/4 Test Cases Verified</span>
                        </div>
                    </div>

                    {/* Feature Bullets */}
                    <div className="space-y-1.5 pt-1 text-xs text-[#71717A] font-mono">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Zero human bias. Objective AI dialogue & DSA scoring.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Real-time voice turn-taking and speech barge-in.</span>
                        </div>
                    </div>
                </div>

                {/* Footer Metadata */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[#52525B]">
                    <span>VOXCODE v2.4 // PRODUCTION</span>
                    <span>ENCRYPTION: TLS 1.3 AES-GCM</span>
                </div>
            </div>

            {/* Right Pane: Authentication Console */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-sm space-y-6">
                    {/* Header */}
                    <div className="space-y-1.5">
                        <h1 className="text-xl font-semibold text-[#FAFAFA] tracking-tight">
                            Sign in to VoxCode
                        </h1>
                        <p className="text-xs text-[#71717A]">
                            Select your operational role and authenticate to access the workspace.
                        </p>
                    </div>

                    {/* Mechanical Segmented Role Selector */}
                    <div className="grid grid-cols-2 p-1 bg-[#111114] border border-[#222228] rounded-md gap-1">
                        <button
                            type="button"
                            onClick={() => setRole('CANDIDATE')}
                            className={`py-1.5 text-xs font-mono font-medium rounded transition-all ${
                                role === 'CANDIDATE'
                                    ? 'bg-[#18181C] text-[#FAFAFA] border border-[#3F3F46]'
                                    : 'text-[#71717A] hover:text-[#FAFAFA]'
                            }`}
                        >
                            [CANDIDATE]
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('COMPANY')}
                            className={`py-1.5 text-xs font-mono font-medium rounded transition-all ${
                                role === 'COMPANY'
                                    ? 'bg-[#18181C] text-[#FAFAFA] border border-[#3F3F46]'
                                    : 'text-[#71717A] hover:text-[#FAFAFA]'
                            }`}
                        >
                            [RECRUITER]
                        </button>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-md text-xs text-[#F43F5E] flex items-center gap-2 font-mono">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-mono text-[#A1A1AA] uppercase block">
                                Account Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="engineer@domain.com"
                                className="studio-input"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-mono text-[#A1A1AA] uppercase">
                                    Password
                                </label>
                                <span className="text-[11px] font-mono text-[#52525B]">8+ characters</span>
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
                            className="studio-btn-primary w-full py-2.5 text-xs font-semibold"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-[#09090B] border-t-transparent rounded-full animate-spin"></span>
                                    <span>Authenticating...</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <span>Authenticate Session</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials Quick-Fill Helper */}
                    <div className="border-t border-[#222228] pt-4 space-y-2">
                        <span className="text-[10px] font-mono uppercase text-[#52525B] block">
                            Quick-Fill Test Credentials:
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <button
                                type="button"
                                onClick={() => {
                                    setRole('CANDIDATE');
                                    setEmail('sarah.chen@example.com');
                                    setPassword('password123');
                                }}
                                className="studio-btn-secondary py-1 text-left justify-start"
                            >
                                <span className="truncate">Candidate: Sarah</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRole('COMPANY');
                                    setEmail('recruiter@acme.ai');
                                    setPassword('password123');
                                }}
                                className="studio-btn-secondary py-1 text-left justify-start"
                            >
                                <span className="truncate">Recruiter: Acme</span>
                            </button>
                        </div>
                    </div>

                    {/* Link to Register */}
                    <div className="text-center pt-2">
                        <p className="text-xs text-[#71717A]">
                            Need a new developer or recruiter account?{' '}
                            <Link to="/register" className="text-[#FAFAFA] underline underline-offset-4 hover:text-[#E4E4E7]">
                                Register account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
