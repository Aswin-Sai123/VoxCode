/** @type {import('tailwindcss').Config} */
export default {
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
        studio: {
          canvas: '#09090B',
          panel: '#111114',
          hover: '#18181C',
          border: '#222228',
          focus: '#3F3F46',
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          muted: '#52525B',
          emerald: '#10B981',
          amber: '#F59E0B',
          crimson: '#F43F5E',
        },
        primary: {
          50: '#f4f4f5',
          100: '#e4e4e7',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
        },
        dark: '#09090B',
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        widest: '0.08em',
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      }
    },
  },
  plugins: [],
}
