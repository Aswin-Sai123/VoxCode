import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { playClick } from '../../utils/soundEffects';

const CopyButton = ({ 
    textToCopy, 
    label = '', 
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
            setTimeout(() => setCopied(false), 1800);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy"}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0A0A0B] border border-[#232330] hover:border-[#38384A] text-xs font-mono text-[#EDEDF0] transition-colors duration-150 active:scale-[0.97] group cursor-pointer ${className}`}
        >
            {label && <span className="text-[#8B8B9E] mr-0.5">{label}</span>}
            <span className="tracking-wider">{textToCopy}</span>

            {/* Icon Morph Container */}
            <span className="relative w-3.5 h-3.5 flex items-center justify-center ml-1">
                {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 transition-transform duration-200 scale-100" />
                ) : (
                    <Copy className="w-3.5 h-3.5 text-[#8B8B9E] group-hover:text-[#EDEDF0] transition-colors duration-150" />
                )}
            </span>
        </button>
    );
};

export default CopyButton;
