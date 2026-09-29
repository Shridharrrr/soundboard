/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'subtle': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card': '0 0 0 1px rgba(24, 24, 27, 0.07), 0 1px 2px 0 rgba(24, 24, 27, 0.04)',
        'card-hover': '0 0 0 1px rgba(24, 24, 27, 0.12), 0 4px 12px 0 rgba(24, 24, 27, 0.05)',
      },
      keyframes: {
        borderGlow: {
          '0%': { borderColor: '#18181b', boxShadow: '0 0 0 2px rgba(24, 24, 27, 0.1)' },
          '100%': { borderColor: 'rgba(228, 228, 231, 1)', boxShadow: 'none' },
        },
      },
      animation: {
        'border-pulse': 'borderGlow 0.8s ease-out',
      },
    },
  },
  plugins: [],
};
