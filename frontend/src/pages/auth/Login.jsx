import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

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
            setError('Google login failed. Please try again.');
        } else if (access && refresh) {
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh);
            // Force a hard reload to the dashboard so AuthContext catches the new token
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
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex">
            {/* Left Side - Branding / Graphic */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-dark overflow-hidden flex-col justify-center items-center p-12">
                {/* Background glowing effects */}
                <div className="absolute top-0 -left-10 w-96 h-96 bg-primary-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob"></div>
                <div className="absolute bottom-0 -right-10 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>
                
                <div className="relative z-10 w-full max-w-lg">
                    <div className="glass-dark p-10 rounded-3xl shadow-2xl">
                        <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                            Hire the best,<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">zero bias.</span>
                        </h1>
                        <p className="text-gray-300 text-lg leading-relaxed mb-8">
                            VoxCode uses advanced AI and voice analysis to conduct technical interviews that are fair, deep, and fully automated.
                        </p>
                        
                        <div className="flex items-center space-x-4">
                            <div className="flex -space-x-3">
                                <img className="w-10 h-10 rounded-full border-2 border-dark" src="https://i.pravatar.cc/100?img=1" alt="Avatar" />
                                <img className="w-10 h-10 rounded-full border-2 border-dark" src="https://i.pravatar.cc/100?img=2" alt="Avatar" />
                                <img className="w-10 h-10 rounded-full border-2 border-dark" src="https://i.pravatar.cc/100?img=3" alt="Avatar" />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">Trusted by 10,000+ engineers</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
                {/* Mobile background blobs */}
                <div className="lg:hidden absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-2000"></div>
                </div>

                <div className="mx-auto w-full max-w-sm lg:max-w-md relative z-10">
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 font-medium">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                                Sign up for free
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8">
                        {/* Role Toggle */}
                        <div className="flex p-1.5 space-x-1 bg-gray-100 rounded-xl mb-8">
                            <button
                                className={`w-full py-2 text-sm font-bold rounded-lg transition-all duration-200 ${role === 'CANDIDATE' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setRole('CANDIDATE')}
                            >
                                Candidate
                            </button>
                            <button
                                className={`w-full py-2 text-sm font-bold rounded-lg transition-all duration-200 ${role === 'COMPANY' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setRole('COMPANY')}
                            >
                                Company
                            </button>
                        </div>

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg text-center font-medium">
                                    {error}
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email address</label>
                                <div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 sm:text-sm font-medium bg-gray-50 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                                <div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 sm:text-sm font-medium bg-gray-50 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/30 text-sm font-bold text-white bg-dark hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {isSubmitting ? 'Signing in...' : 'Sign in to account'}
                                </button>
                            </div>
                        </form>

                        {role === 'CANDIDATE' && (
                            <div className="mt-8">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}
                                        className="w-full inline-flex justify-center items-center py-3.5 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
                                    >
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Google
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
