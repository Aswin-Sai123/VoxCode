
const EmptyState = ({
    title = 'No items found',
    description = 'There are no items to display right now.',
    actionLabel,
    onAction,
    actionIcon: ActionIcon,
    className = ''
}) => {
    return (
        <div className={`p-8 text-center space-y-3.5 flex flex-col items-center justify-center ${className}`}>
            {/* Clean Icon Badge */}
            <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-[#232330] bg-slate-50 dark:bg-[#0A0A0B] flex items-center justify-center text-slate-400 dark:text-[#8B8B9E] shadow-sm">
                {ActionIcon ? <ActionIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-[#555568]" />}
            </div>

            {/* Typography */}
            <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#EDEDF0]">
                    {title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8B8B9E] leading-relaxed">
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
