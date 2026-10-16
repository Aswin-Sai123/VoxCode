import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Terminal, ArrowRight, ShieldCheck, Cpu, Code2, AlertCircle } from 'lucide-react';

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
        <div className="flex-1 flex min-h-[calc(100vh-48px)] bg-[#09090B]">
            {/* Left Pane: Architecture Showcase */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#09090B] bg-grid-studio border-r border-[#222228] p-12 flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm bg-[#FAFAFA]"></span>
                        <span className="font-mono text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                            VoxCode // Engineering Platform Registration
                        </span>
                    </div>
                    <span className="studio-badge bg-[#111114] text-[#A1A1AA] border-[#222228]">
                        PROD.CLUSTER
                    </span>
                </div>

                {/* Technical Architecture Preview Card */}
                <div className="max-w-md w-full bg-[#111114] border border-[#222228] rounded-md p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                        <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-[#A1A1AA]" />
                            <span className="font-mono text-xs text-[#FAFAFA] font-medium uppercase">
                                Autonomous Technical Assessment
                            </span>
                        </div>
                        <span className="font-mono text-[11px] text-[#10B981]">[STABLE]</span>
                    </div>

                    <div className="space-y-3 font-mono text-xs text-[#A1A1AA]">
                        <div className="p-3 bg-[#09090B] border border-[#222228] rounded space-y-1">
                            <span className="text-[10px] text-[#52525B] uppercase block">Stage 01 // Voice Screening</span>
                            <p className="text-[#FAFAFA]">Real-time conversational audio screening with tech leads (Rohan).</p>
                        </div>
                        <div className="p-3 bg-[#09090B] border border-[#222228] rounded space-y-1">
                            <span className="text-[10px] text-[#52525B] uppercase block">Stage 02 // Polyglot Sandbox</span>
                            <p className="text-[#FAFAFA]">Sub-second native compilers for JavaScript, Python 3, C++, and Java.</p>
                        </div>
                        <div className="p-3 bg-[#09090B] border border-[#222228] rounded space-y-1">
                            <span className="text-[10px] text-[#52525B] uppercase block">Stage 03 // Gemini 2.5 Flash Grading</span>
                            <p className="text-[#FAFAFA]">4-dimension scoring, Big-O complexity telemetry, and hiring decisions.</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-[#52525B]">
                    <span>VOXCODE SPEC v2.4</span>
                    <span>PRIVACY: ZERO MODEL TRAINING ON CODE</span>
                </div>
            </div>

            {/* Right Pane: Registration Form Console */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-sm space-y-6">
                    <div className="space-y-1.5">
                        <h1 className="text-xl font-semibold text-[#FAFAFA] tracking-tight">
                            Create VoxCode Account
                        </h1>
                        <p className="text-xs text-[#71717A]">
                            Initialize your candidate or recruiter credentials.
                        </p>
                    </div>

                    {/* Role Segmented Selector */}
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

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-mono text-[#A1A1AA] uppercase block">
                                {role === 'COMPANY' ? 'Company Name' : 'Full Name'}
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={role === 'COMPANY' ? 'Acme Technologies' : 'Alex Mercer'}
                                className="studio-input"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-mono text-[#A1A1AA] uppercase block">
                                Work Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="studio-input"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-mono text-[#A1A1AA] uppercase block">
                                Password
                            </label>
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
                            className="studio-btn-primary w-full py-2.5 text-xs font-semibold"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-[#09090B] border-t-transparent rounded-full animate-spin"></span>
                                    <span>Creating Account...</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <span>Register & Proceed</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-2">
                        <p className="text-xs text-[#71717A]">
                            Already registered?{' '}
                            <Link to="/login" className="text-[#FAFAFA] underline underline-offset-4 hover:text-[#E4E4E7]">
                                Sign in to session
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
