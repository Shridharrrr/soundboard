/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#090b10',
          850: '#0f131a',
          800: '#141824',
          750: '#1b2132',
          700: '#232b40',
          600: '#343f5c',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        accent: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e',
          amber: '#f59e0b',
          violet: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-pulse': 'borderGlow 0.8s ease-out',
      },
      keyframes: {
        borderGlow: {
          '0%': { borderColor: '#6366f1', boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)' },
          '100%': { borderColor: 'rgba(255, 255, 255, 0.1)', boxShadow: 'none' },
        },
      },
    },
  },
  plugins: [],
};
