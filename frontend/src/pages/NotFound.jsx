import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const NotFound = () => {
    const { isDark } = useTheme();

    return (
        <div className="flex-1 flex items-center justify-center p-6 relative">
            <div className={`max-w-md w-full ${isDark ? 'bg-[#141419] border-[#232330]' : 'bg-white border-slate-200 shadow-xl'} border rounded-2xl p-8 space-y-6 text-center relative z-10 transition-colors`}>
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                    <FileQuestion className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                    <span className="text-xs font-mono font-bold tracking-widest text-blue-500 uppercase">
                        Error 404
                    </span>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-[#EDEDF0]' : 'text-slate-900'}`}>
                        Page Not Found
                    </h1>
                    <p className={`text-xs ${isDark ? 'text-[#8B8B9E]' : 'text-slate-600'} leading-relaxed`}>
                        The page or assessment route you are looking for does not exist, has been archived, or was moved.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                        onClick={() => window.history.back()}
                        className="w-full studio-btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Go Back</span>
                    </button>
                    <Link
                        to="/"
                        className="w-full btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 text-center"
                    >
                        <Home className="w-3.5 h-3.5" />
                        <span>Dashboard</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
