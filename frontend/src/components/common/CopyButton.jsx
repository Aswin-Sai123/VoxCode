import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { playClick } from '../../utils/soundEffects';

const CopyButton = ({ 
    textToCopy, 
    label = '', 
    successMessage = 'Copied to clipboard',
    className = '' 
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await navigator.clipboard.writeText(textToCopy);
            playClick();
            setCopied(true);
            toast.success(successMessage);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
            toast.error('Could not copy to clipboard');
        }
    };

    return (
        <button
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy to clipboard"}
            className={`relative inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0A0A0B] border border-[#232330] hover:border-[#38384A] text-xs font-mono text-[#EDEDF0] transition-all duration-150 active:scale-[0.95] group ${className}`}
        >
            {label && <span className="text-[#8B8B9E] mr-0.5">{label}</span>}
            <span className="tracking-wider">{textToCopy}</span>

            {/* Icon Morph Container */}
            <span className="relative w-3.5 h-3.5 flex items-center justify-center ml-1">
                <Copy 
                    className={`w-3.5 h-3.5 text-[#8B8B9E] group-hover:text-[#EDEDF0] transition-all duration-300 absolute inset-0 ${
                        copied ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                    }`} 
                />
                <Check 
                    className={`w-3.5 h-3.5 text-emerald-400 transition-all duration-300 absolute inset-0 ${
                        copied ? 'scale-110 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
                    }`} 
                />
            </span>

            {/* Soft Floating Tooltip */}
            {copied && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-emerald-500 text-[#0A0A0B] text-[10px] font-sans font-semibold shadow-lg shadow-emerald-500/20 whitespace-nowrap animate-in fade-in zoom-in-90 duration-150 pointer-events-none z-20">
                    Copied!
                </span>
            )}
        </button>
    );
};

export default CopyButton;
