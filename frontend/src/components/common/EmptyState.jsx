import React from 'react';

const EmptyState = ({
    title = 'No items found',
    description = 'There are no items to display right now.',
    actionLabel,
    onAction,
    actionIcon: ActionIcon,
    className = ''
}) => {
    return (
        <div className={`p-10 text-center space-y-4 flex flex-col items-center justify-center ${className}`}>
            {/* Layered Geometry Graphic */}
            <div className="relative w-24 h-24 flex items-center justify-center my-2">
                {/* Subtle isometric grid lines */}
                <svg
                    className="absolute inset-0 w-full h-full text-blue-500/10 stroke-current opacity-70"
                    viewBox="0 0 100 100"
                    fill="none"
                >
                    <line x1="10" y1="50" x2="50" y2="20" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="50" y1="20" x2="90" y2="50" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="90" y1="50" x2="50" y2="80" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="50" y1="80" x2="10" y2="50" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="50" y1="20" x2="50" y2="80" strokeWidth="0.75" />
                    <line x1="10" y1="50" x2="90" y2="50" strokeWidth="0.75" />
                </svg>

                {/* Back Glowing Accent Ring */}
                <div className="absolute w-20 h-20 rounded-2xl bg-blue-500/10 blur-xl animate-pulse" />

                {/* Layer 1: Outermost angled frosted glass square */}
                <div className="absolute w-16 h-16 rounded-xl border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/[0.02] backdrop-blur-sm transform rotate-12 transition-transform duration-500 group-hover:rotate-45" />

                {/* Layer 2: Middle counter-angled frosted glass square */}
                <div className="absolute w-14 h-14 rounded-xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-md transform -rotate-6 shadow-lg shadow-blue-500/10 transition-transform duration-500 group-hover:-rotate-12" />

                {/* Layer 3: Center focal square with glowing accent ring */}
                <div className="relative w-11 h-11 rounded-lg border border-white/20 bg-[#141419]/90 dark:bg-[#141419]/90 flex items-center justify-center shadow-inner light-catch">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400 animate-ping opacity-75 absolute" />
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-400 relative z-10" />
                </div>
            </div>

            {/* Typography */}
            <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#EDEDF0] metallic-heading">
                    {title}
                </h3>
                <p className="text-xs text-[#8B8B9E] leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Action */}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="btn-primary text-xs py-2 px-4 mt-2 inline-flex items-center gap-2 active:scale-[0.98] transition-transform duration-100"
                >
                    {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
                    <span>{actionLabel}</span>
                </button>
            )}
        </div>
    );
};

export default EmptyState;
