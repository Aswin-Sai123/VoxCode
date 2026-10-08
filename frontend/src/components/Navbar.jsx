import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <nav className="bg-white shadow-sm border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/" className="text-2xl font-bold text-primary tracking-tight">
                            VoxCode
                        </Link>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <span className="text-sm text-gray-600 font-medium">
                                    Hello, {user.name}
                                </span>
                                <button
                                    onClick={logout}
                                    className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                    Log in
                                </Link>
                                <Link to="/register" className="ml-4 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
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
