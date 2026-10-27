import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const SpotlightCard = ({
    children,
    className = '',
    spotlightColor = 'rgba(99, 102, 241, 0.12)',
    lightSpotlightColor = 'rgba(59, 130, 246, 0.08)',
    ...props
}) => {
    const { isDark } = useTheme();
    const divRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleFocus = () => {
        setOpacity(1);
    };

    const handleBlur = () => {
        setOpacity(0);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    const activeSpotlight = isDark ? spotlightColor : lightSpotlightColor;

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
                isDark 
                    ? 'bg-[#141419] border-[#232330] hover:border-[#363645] light-catch' 
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
            } ${className}`}
            {...props}
        >
            {/* Spotlight Gradient Layer */}
            <div
                className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
                style={{
                    opacity,
                    background: `radial-gradient(450px circle at ${position.x}px ${position.y}px, ${activeSpotlight}, transparent 80%)`,
                }}
            />

            {/* Card Content */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default SpotlightCard;
