import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

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
                // Redirect to login on success
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex">
            {/* Left Side - Branding / Graphic */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-dark overflow-hidden flex-col justify-center items-center p-12">
                <div className="absolute top-0 -left-10 w-96 h-96 bg-primary-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob"></div>
                <div className="absolute bottom-0 -right-10 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>
                
                <div className="relative z-10 w-full max-w-lg">
                    <div className="glass-dark p-10 rounded-3xl shadow-2xl">
                        <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                            Start interviewing<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">in minutes.</span>
                        </h1>
                        <p className="text-gray-300 text-lg leading-relaxed mb-8">
                            Join the platform that is revolutionizing tech recruitment with voice AI and automated coding assessments.
                        </p>
                        
                        <div className="flex items-center space-x-4">
                            <div className="flex -space-x-3">
                                <img className="w-10 h-10 rounded-full border-2 border-dark" src="https://i.pravatar.cc/100?img=4" alt="Avatar" />
                                <img className="w-10 h-10 rounded-full border-2 border-dark" src="https://i.pravatar.cc/100?img=5" alt="Avatar" />
                                <img className="w-10 h-10 rounded-full border-2 border-dark" src="https://i.pravatar.cc/100?img=6" alt="Avatar" />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">Join 500+ top tech companies</p>
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
                            Create an account
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 font-medium">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                                Sign in instead
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
                                <label className="block text-sm font-bold text-gray-700 mb-2">{role === 'COMPANY' ? 'Company Name' : 'Full Name'}</label>
                                <div>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={role === 'COMPANY' ? 'Acme Corp' : 'John Doe'}
                                        className="appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 sm:text-sm font-medium bg-gray-50 focus:bg-white"
                                    />
                                </div>
                            </div>
                            
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
                                    {isSubmitting ? 'Creating account...' : 'Create account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
