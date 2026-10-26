import React, { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        try {
            const saved = localStorage.getItem('voxcode_theme');
            if (saved === 'light' || saved === 'dark') return saved;
            return 'dark'; // default to dark
        } catch {
            return 'dark';
        }
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.remove('dark');
            root.classList.add('light');
            root.setAttribute('data-theme', 'light');
            root.style.colorScheme = 'light';
        } else {
            root.classList.remove('light');
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
            root.style.colorScheme = 'dark';
        }
        try {
            localStorage.setItem('voxcode_theme', theme);
        } catch (e) {
            console.warn('Unable to persist theme to localStorage', e);
        }
    }, [theme]);

    // Cross-tab theme synchronization
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'voxcode_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
                setTheme(e.newValue);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
