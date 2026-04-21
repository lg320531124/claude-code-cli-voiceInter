/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1e1e2e',
          foreground: '#cdd6f4',
        },
        background: '#11111b',
        foreground: '#cdd6f4',
        card: {
          DEFAULT: '#181825',
          foreground: '#cdd6f4',
        },
        muted: {
          DEFAULT: '#313244',
          foreground: '#6c7086',
        },
        accent: {
          DEFAULT: '#f5c2e7',
          foreground: '#11111b',
        },
        destructive: {
          DEFAULT: '#f38ba8',
          foreground: '#11111b',
        },
        border: '#45475a',
        input: '#313244',
        ring: '#6366f1',
        voice: {
          active: '#f38ba8',
          ready: '#a6e3a1',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-voice': 'pulse-voice 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-voice': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0 0 rgba(243, 139, 168, 0.4)' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8', boxShadow: '0 0 0 15px rgba(243, 139, 168, 0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};