import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <nav className="fixed w-full z-50 glass border-b border-white/20 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/" className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600 tracking-tight">
                            VoxCode
                        </Link>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <span className="text-sm text-gray-700 font-semibold bg-white/50 px-3 py-1.5 rounded-full shadow-inner border border-white">
                                    Hello, {user.name}
                                </span>
                                <button
                                    onClick={logout}
                                    className="ml-4 px-4 py-2 text-sm font-bold text-gray-700 bg-white/80 hover:bg-white rounded-xl transition-all shadow-sm border border-gray-200 hover:shadow-md transform hover:-translate-y-0.5"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-primary-600 transition-colors">
                                    Log in
                                </Link>
                                <Link to="/register" className="ml-4 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 rounded-xl transition-all shadow-md shadow-primary-500/20 transform hover:-translate-y-0.5">
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
