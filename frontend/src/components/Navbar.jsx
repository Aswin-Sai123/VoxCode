import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Terminal, LogOut, FileText, Plus, LayoutDashboard, User, Play } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();

    // Compute dynamic engineering breadcrumb
    const getBreadcrumb = () => {
        const path = location.pathname;
        if (path.includes('/candidate/dashboard')) return 'candidate // workspace';
        if (path.includes('/candidate/reports') || path.includes('/candidate/report/')) return 'candidate // dossier';
        if (path.includes('/candidate/assessment')) return 'candidate // pre-flight';
        if (path.includes('/candidate/interview')) return 'candidate // live-session';
        if (path.includes('/company/dashboard')) return 'recruiter // pipeline';
        if (path.includes('/company/create-assessment')) return 'recruiter // spec-builder';
        if (path.includes('/company/assessment/')) return 'recruiter // leaderboard';
        if (path === '/login') return 'auth // sign-in';
        if (path === '/register') return 'auth // register';
        return 'studio // core';
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-12 z-50 bg-[#09090B]/95 backdrop-blur-md border-b border-[#222228] select-none">
            <div className="h-full px-4 sm:px-6 flex items-center justify-between">
                {/* Left: Geometric Wordmark & Dynamic Breadcrumb */}
                <div className="flex items-center gap-2.5">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-6 h-6 rounded bg-[#18181C] border border-[#222228] group-hover:border-[#3F3F46] flex items-center justify-center transition-colors">
                            <Terminal className="w-3.5 h-3.5 text-[#FAFAFA]" />
                        </div>
                        <span className="font-mono text-xs font-semibold tracking-wider text-[#FAFAFA] group-hover:text-[#E4E4E7] uppercase">
                            VoxCode
                        </span>
                    </Link>

                    <span className="text-[#3F3F46] font-mono text-xs select-none">/</span>

                    <span className="font-mono text-[11px] text-[#71717A] tracking-tight lowercase">
                        {getBreadcrumb()}
                    </span>
                </div>

                {/* Right: Telemetry & Navigation Controls */}
                <div className="flex items-center gap-3">
                    {/* Live System Indicator */}
                    <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111114] border border-[#222228] text-[10px] font-mono text-[#71717A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                        <span className="text-[#A1A1AA] font-medium">SYS.ONLINE</span>
                    </div>

                    {user ? (
                        <>
                            {/* Role-Specific Navigation Tabs */}
                            <nav className="flex items-center gap-1">
                                {user.role === 'CANDIDATE' && (
                                    <>
                                        <Link
                                            to="/candidate/dashboard"
                                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                                location.pathname === '/candidate/dashboard'
                                                    ? 'bg-[#18181C] text-[#FAFAFA] border border-[#3F3F46]'
                                                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111114]'
                                            }`}
                                        >
                                            <LayoutDashboard className="w-3.5 h-3.5" />
                                            <span>Workspace</span>
                                        </Link>
                                        <Link
                                            to="/candidate/interview/PRACTICE-MOCK-SESSION"
                                            className="px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 text-[#10B981] hover:bg-[#10B981]/10 border border-[#10B981]/30"
                                        >
                                            <Play className="w-3 h-3 fill-current" />
                                            <span>Mock Interview</span>
                                        </Link>
                                        <Link
                                            to="/candidate/reports"
                                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                                location.pathname.startsWith('/candidate/report')
                                                    ? 'bg-[#18181C] text-[#FAFAFA] border border-[#3F3F46]'
                                                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111114]'
                                            }`}
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>Dossiers</span>
                                        </Link>
                                    </>
                                )}

                                {user.role === 'COMPANY' && (
                                    <>
                                        <Link
                                            to="/company/dashboard"
                                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                                location.pathname === '/company/dashboard'
                                                    ? 'bg-[#18181C] text-[#FAFAFA] border border-[#3F3F46]'
                                                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111114]'
                                            }`}
                                        >
                                            <LayoutDashboard className="w-3.5 h-3.5" />
                                            <span>Pipeline</span>
                                        </Link>
                                        <Link
                                            to="/company/create-assessment"
                                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                                location.pathname === '/company/create-assessment'
                                                    ? 'bg-[#18181C] text-[#FAFAFA] border border-[#3F3F46]'
                                                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111114]'
                                            }`}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>New Assessment</span>
                                        </Link>
                                    </>
                                )}
                            </nav>

                            <div className="h-4 w-[1px] bg-[#222228] mx-1"></div>

                            {/* User Role Badge & Identifier */}
                            <div className="flex items-center gap-2">
                                <span className="studio-badge bg-[#111114] text-[#A1A1AA] border-[#222228]">
                                    {user.role}
                                </span>
                                <span className="hidden sm:inline-block text-xs font-mono text-[#FAFAFA] truncate max-w-[140px]">
                                    {user.name}
                                </span>
                            </div>

                            {/* Minimal Logout Button */}
                            <button
                                onClick={logout}
                                title="Sign Out of Session"
                                className="studio-btn-secondary p-1.5 text-[#71717A] hover:text-[#FAFAFA]"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                to="/login"
                                className="px-3 py-1 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/register"
                                className="studio-btn-primary"
                            >
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
