import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Terminal, LogOut, FileText, Plus, LayoutDashboard, Sun, Moon, Menu, X } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { toggleTheme, isDark } = useTheme();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const prevPathRef = useRef(location.pathname);

    // Auto-close mobile/split-screen drawer when route changes
    useEffect(() => {
        if (prevPathRef.current !== location.pathname) {
            prevPathRef.current = location.pathname;
            setMobileMenuOpen(false);
        }
    }, [location.pathname]);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-[#232330] select-none">
            <div className="max-w-7xl mx-auto h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                {/* Left: Brand */}
                <div className="flex items-center gap-4 sm:gap-6">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm tracking-tight text-[#EDEDF0] group-hover:text-blue-500 transition-colors">
                            VoxCode
                        </span>
                    </Link>

                    {/* Navigation Links for Authenticated Users (Desktop / Full Screen) */}
                    {user && (
                        <nav className="hidden md:flex items-center gap-1 pl-2">
                            {user.role === 'CANDIDATE' && (
                                <>
                                    <Link
                                        to="/candidate/dashboard"
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border ${
                                            location.pathname === '/candidate/dashboard'
                                                ? 'nav-link-active'
                                                : 'nav-link-inactive border-transparent'
                                        }`}
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>Dashboard</span>
                                    </Link>

                                    <Link
                                        to="/candidate/reports"
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border ${
                                            location.pathname.startsWith('/candidate/report')
                                                ? 'nav-link-active'
                                                : 'nav-link-inactive border-transparent'
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
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border ${
                                            location.pathname === '/company/dashboard'
                                                ? 'nav-link-active'
                                                : 'nav-link-inactive border-transparent'
                                        }`}
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>Dashboard</span>
                                    </Link>
                                    <Link
                                        to="/company/create-assessment"
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border ${
                                            location.pathname === '/company/create-assessment'
                                                ? 'nav-link-active'
                                                : 'nav-link-inactive border-transparent'
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
                <div className="flex items-center gap-2.5 sm:gap-3">
                    {/* Theme Mode Toggle (Dark / White) */}
                    <button
                        onClick={toggleTheme}
                        aria-label={isDark ? "Switch to white mode" : "Switch to dark mode"}
                        title={isDark ? "Switch to white mode" : "Switch to dark mode"}
                        className="p-1.5 rounded-lg border border-[#232330] hover:border-[#363645] bg-[#141419] hover:bg-[#1C1C24] text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors flex items-center justify-center cursor-pointer"
                    >
                        {isDark ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                            <Moon className="w-4 h-4 text-blue-500" />
                        )}
                    </button>

                    {/* Mobile / Split-Screen Menu Toggle Button */}
                    {user && (
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                            title="Navigation Menu"
                            className="md:hidden p-1.5 rounded-lg border border-[#232330] hover:border-[#363645] bg-[#141419] hover:bg-[#1C1C24] text-[#8B8B9E] hover:text-[#EDEDF0] transition-colors flex items-center justify-center cursor-pointer"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-4 h-4 text-blue-500" />
                            ) : (
                                <Menu className="w-4 h-4" />
                            )}
                        </button>
                    )}

                    {user ? (
                        <>
                            <div className="hidden sm:flex items-center gap-3 pl-1 sm:pl-2">
                                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-xs flex items-center justify-center">
                                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-xs font-medium text-[#EDEDF0] leading-tight truncate max-w-[120px]">
                                        {user.name}
                                    </span>
                                    <span className="text-[11px] text-[#8B8B9E] capitalize leading-tight">
                                        {user.role === 'COMPANY' ? 'Recruiter' : 'Candidate'}
                                    </span>
                                </div>
                            </div>

                            <div className="hidden sm:block h-4 w-[1px] bg-[#232330] mx-1"></div>

                            <button
                                onClick={logout}
                                title="Sign out"
                                className="hidden sm:inline-flex studio-btn-secondary px-2.5 py-1.5 text-xs text-[#8B8B9E] hover:text-[#EDEDF0]"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign out</span>
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                to="/login"
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-[#8B8B9E] dark:hover:text-[#EDEDF0] transition-colors"
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

            {/* Mobile / Split-Screen Navigation Dropdown Drawer */}
            {mobileMenuOpen && user && (
                <div className="md:hidden border-t border-[#232330] bg-[#0A0A0B]/95 backdrop-blur-lg px-4 py-3 space-y-2.5 shadow-2xl animate-fadeIn">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#232330]/60 sm:hidden">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-xs flex items-center justify-center">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-[#EDEDF0] leading-tight">
                                    {user.name}
                                </span>
                                <span className="text-[11px] text-[#8B8B9E] capitalize leading-tight">
                                    {user.role === 'COMPANY' ? 'Recruiter' : 'Candidate'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="studio-btn-secondary px-2.5 py-1 text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign out</span>
                        </button>
                    </div>

                    <div className="space-y-1 pt-0.5">
                        {user.role === 'CANDIDATE' && (
                            <>
                                <Link
                                    to="/candidate/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2.5 border ${
                                        location.pathname === '/candidate/dashboard'
                                            ? 'nav-link-active'
                                            : 'nav-link-inactive border-transparent'
                                    }`}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    <span>Dashboard</span>
                                </Link>

                                <Link
                                    to="/candidate/reports"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2.5 border ${
                                        location.pathname.startsWith('/candidate/report')
                                            ? 'nav-link-active'
                                            : 'nav-link-inactive border-transparent'
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
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2.5 border ${
                                        location.pathname === '/company/dashboard'
                                            ? 'nav-link-active'
                                            : 'nav-link-inactive border-transparent'
                                    }`}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    <span>Dashboard</span>
                                </Link>
                                <Link
                                    to="/company/create-assessment"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2.5 border ${
                                        location.pathname === '/company/create-assessment'
                                            ? 'nav-link-active'
                                            : 'nav-link-inactive border-transparent'
                                    }`}
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Create Assessment</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
