/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        canvas: '#0A0A0B',
        surface: '#141419',
        surfaceHover: '#1C1C24',
        border: '#232330',
        borderHover: '#363645',
        textPrimary: '#EDEDF0',
        textSecondary: '#8B8B9E',
        textMuted: '#555568',
        accent: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
        studio: {
          canvas: '#0A0A0B',
          panel: '#141419',
          hover: '#1C1C24',
          border: '#232330',
          focus: '#363645',
          primary: '#EDEDF0',
          secondary: '#8B8B9E',
          muted: '#555568',
          emerald: '#22C55E',
          amber: '#EAB308',
          crimson: '#EF4444',
          accent: '#3B82F6',
        },
        dark: '#0A0A0B',
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.015em',
        normal: '0',
        wide: '0.015em',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      }
    },
  },
  plugins: [],
}
