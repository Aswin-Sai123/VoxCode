import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Terminal, LogOut, FileText, Plus, LayoutDashboard, User } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();

    return (
        <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-[#232330] select-none">
            <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                {/* Left: Brand */}
                <div className="flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm tracking-tight text-[#EDEDF0] group-hover:text-white">
                            VoxCode
                        </span>
                    </Link>

                    {/* Navigation Links for Authenticated Users */}
                    {user && (
                        <nav className="hidden sm:flex items-center gap-1 pl-2">
                            {user.role === 'CANDIDATE' && (
                                <>
                                    <Link
                                        to="/candidate/dashboard"
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                            location.pathname === '/candidate/dashboard'
                                                ? 'bg-[#1C1C24] text-white border border-[#232330]'
                                                : 'text-[#8B8B9E] hover:text-[#EDEDF0] hover:bg-[#141419]'
                                        }`}
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>Dashboard</span>
                                    </Link>
                                    <Link
                                        to="/candidate/reports"
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                            location.pathname.startsWith('/candidate/report')
                                                ? 'bg-[#1C1C24] text-white border border-[#232330]'
                                                : 'text-[#8B8B9E] hover:text-[#EDEDF0] hover:bg-[#141419]'
                                        }`}
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span>Reports</span>
                                    </Link>
                                </>
                            )}

                            {user.role === 'COMPANY' && (
                                <>
                                    <Link
                                        to="/company/dashboard"
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                            location.pathname === '/company/dashboard'
                                                ? 'bg-[#1C1C24] text-white border border-[#232330]'
                                                : 'text-[#8B8B9E] hover:text-[#EDEDF0] hover:bg-[#141419]'
                                        }`}
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>Dashboard</span>
                                    </Link>
                                    <Link
                                        to="/company/create-assessment"
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                            location.pathname === '/company/create-assessment'
                                                ? 'bg-[#1C1C24] text-white border border-[#232330]'
                                                : 'text-[#8B8B9E] hover:text-[#EDEDF0] hover:bg-[#141419]'
                                        }`}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Create Assessment</span>
                                    </Link>
                                </>
                            )}
                        </nav>
                    )}
                </div>

                {/* Right: User Profile & Actions */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <div className="flex items-center gap-3 pl-2">
                                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-xs flex items-center justify-center">
                                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="hidden sm:flex flex-col text-left">
                                    <span className="text-xs font-medium text-[#EDEDF0] leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="text-[11px] text-[#8B8B9E] capitalize leading-tight">
                                        {user.role === 'COMPANY' ? 'Recruiter' : 'Candidate'}
                                    </span>
                                </div>
                            </div>

                            <div className="h-4 w-[1px] bg-[#232330] mx-1"></div>

                            <button
                                onClick={logout}
                                title="Sign out"
                                className="studio-btn-secondary px-2.5 py-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0]"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sign out</span>
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                to="/login"
                                className="px-3 py-1.5 text-xs font-medium text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors"
                            >
                                Sign in
                            </Link>
                            <Link
                                to="/register"
                                className="btn-primary text-xs py-1.5 px-3"
                            >
                                Get started
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
