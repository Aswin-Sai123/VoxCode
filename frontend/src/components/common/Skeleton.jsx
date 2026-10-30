import { useTheme } from '../../context/ThemeContext';

export const Skeleton = ({ className = '', ...props }) => {
    const { isDark } = useTheme();
    return (
        <div
            className={`relative overflow-hidden rounded-md ${
                isDark ? 'bg-[#1C1C24]' : 'bg-slate-200'
            } ${className}`}
            {...props}
        >
            <div className="absolute inset-0 skeleton-shimmer" />
        </div>
    );
};

export const CardSkeleton = () => {
    const { isDark } = useTheme();
    return (
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#141419] border-[#232330]' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <div className="pt-4 border-t border-inherit flex items-center justify-between">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
        </div>
    );
};

export const TableSkeleton = ({ rows = 4 }) => {
    const { isDark } = useTheme();
    return (
        <div className={`rounded-xl border ${isDark ? 'bg-[#141419] border-[#232330]' : 'bg-white border-slate-200'} p-4 space-y-3`}>
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="space-y-1.5 w-1/3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
            ))}
        </div>
    );
};

export default Skeleton;
