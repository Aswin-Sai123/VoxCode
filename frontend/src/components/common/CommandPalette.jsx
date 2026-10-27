import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { 
    Search, 
    Command, 
    FileText, 
    Briefcase, 
    PlusCircle, 
    Sun, 
    Moon, 
    Sparkles, 
    ArrowRight, 
    Compass
} from 'lucide-react';
import { toast } from 'sonner';

const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const commands = [
        {
            id: 'candidate-dash',
            title: 'Candidate Dashboard',
            subtitle: 'View mock practice and official interviews',
            category: 'Navigation',
            icon: Compass,
            action: () => navigate('/candidate/dashboard')
        },
        {
            id: 'company-dash',
            title: 'Company Dashboard',
            subtitle: 'Manage assessments, blueprints, and analytics',
            category: 'Navigation',
            icon: Briefcase,
            action: () => navigate('/company/dashboard')
        },
        {
            id: 'reports',
            title: 'My Assessment Reports',
            subtitle: 'Inspect evaluation breakdown and AI feedback',
            category: 'Navigation',
            icon: FileText,
            action: () => navigate('/candidate/reports')
        },
        {
            id: 'create-assessment',
            title: 'Create New Assessment',
            subtitle: 'Upload blueprint and generate tailored round',
            category: 'Recruiter',
            icon: PlusCircle,
            action: () => navigate('/company/create-assessment')
        },
        {
            id: 'start-mock',
            title: 'Start Mock Interview Practice',
            subtitle: 'Launch instant AI voice & coding session',
            category: 'Candidate',
            icon: Sparkles,
            action: () => navigate('/candidate/dashboard')
        },
        {
            id: 'toggle-theme',
            title: `Switch to ${isDark ? 'Light' : 'Dark'} Mode`,
            subtitle: 'Toggle global color scheme',
            category: 'Preferences',
            icon: isDark ? Sun : Moon,
            action: () => {
                toggleTheme();
                toast.success(`Switched to ${isDark ? 'Light' : 'Dark'} mode`);
            }
        }
    ];

    const filtered = commands.filter(c => 
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
    );

    // Global keyboard listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            } else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        const handleCustomOpen = () => setIsOpen(true);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-command-palette', handleCustomOpen);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-command-palette', handleCustomOpen);
        };
    }, [isOpen]);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSelect = (command) => {
        setIsOpen(false);
        command.action();
    };

    const handleKeyNavigation = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
        } else if (e.key === 'Enter' && filtered[selectedIndex]) {
            e.preventDefault();
            handleSelect(filtered[selectedIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 sm:pt-32 p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            {/* Modal backdrop click to close */}
            <div className="fixed inset-0 -z-10" onClick={() => setIsOpen(false)} />

            <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all duration-150 ${
                isDark 
                    ? 'bg-[#141419]/95 border-[#232330] text-[#EDEDF0] light-catch' 
                    : 'bg-white/95 border-slate-200 text-[#0F172A]'
            }`}>
                {/* Search Bar */}
                <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${
                    isDark ? 'border-[#232330]' : 'border-slate-100'
                }`}>
                    <Search className="w-5 h-5 text-[#8B8B9E] flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyNavigation}
                        placeholder="Type a command, page, or search..."
                        className="w-full bg-transparent border-none text-sm focus:outline-none placeholder-[#8B8B9E]"
                    />
                    <kbd className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                        isDark ? 'bg-[#1C1C24] border-[#2A2A38] text-[#8B8B9E]' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                        ESC
                    </kbd>
                </div>

                {/* Results List */}
                <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#8B8B9E]">
                            No matching commands found.
                        </div>
                    ) : (
                        filtered.map((item, index) => {
                            const isSelected = index === selectedIndex;
                            const IconComponent = item.icon;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                                        isSelected 
                                            ? (isDark ? 'bg-[#232330] text-white' : 'bg-slate-100 text-slate-900') 
                                            : (isDark ? 'text-[#8B8B9E] hover:bg-[#1C1C24]' : 'text-slate-600 hover:bg-slate-50')
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                            isSelected
                                                ? 'bg-blue-600 text-white border-blue-500'
                                                : (isDark ? 'bg-[#0A0A0B] border-[#232330] text-[#8B8B9E]' : 'bg-white border-slate-200 text-slate-500')
                                        }`}>
                                            <IconComponent className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-[13px] text-inherit">
                                                {item.title}
                                            </div>
                                            <div className="text-[11px] text-[#8B8B9E]">
                                                {item.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                                            isDark ? 'bg-[#0A0A0B] border-[#232330] text-[#8B8B9E]' : 'bg-slate-50 border-slate-200 text-slate-500'
                                        }`}>
                                            {item.category}
                                        </span>
                                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-blue-400" />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Guide */}
                <div className={`px-4 py-2 border-t flex items-center justify-between text-[11px] font-mono text-[#8B8B9E] ${
                    isDark ? 'border-[#232330] bg-[#0A0A0B]/60' : 'border-slate-100 bg-slate-50'
                }`}>
                    <div className="flex items-center gap-3">
                        <span><kbd className="font-semibold text-current">↑↓</kbd> Navigate</span>
                        <span><kbd className="font-semibold text-current">↵</kbd> Select</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Command className="w-3 h-3" />
                        <span>VoxCode Command</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
