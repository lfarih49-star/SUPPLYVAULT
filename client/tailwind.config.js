import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        // Deep Midnight Navy & Black Foundations
        navy: {
          950: '#020617', // Purest Midnight Black-Navy (Canvas)
          900: '#070F1E', // Dark Obsidian Navy (Panels/Sidebar)
          850: '#0B152A', // Elevated Navy Glass
          800: '#0E1D3B', // Card Surface
          750: '#13264D', // Active Hover Surface
          700: '#172E5C', // Outer Borders
          600: '#1E3A8A', // Deep Royal Navy
          500: '#2563EB', // Primary Executive Navy Blue
          400: '#3B82F6', // Vibrant Sapphire Blue
          300: '#60A5FA', // Sky Slate Blue
          200: '#93C5FD',
          100: '#DBEAFE',
          50: '#EFF6FF',
        },
        // Mapping gold & emerald to Navy Blue to ensure single unified theme across any lingering classes
        gold: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#93C5FD',
          300: '#60A5FA',
          400: '#3B82F6',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
          950: '#0B152A',
        },
        emerald: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#93C5FD',
          300: '#60A5FA',
          400: '#3B82F6',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
          950: '#0B152A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'navy-card': '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'navy-glow': '0 0 35px -5px rgba(37, 99, 235, 0.3)',
        'navy-btn': '0 0 20px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        'navy-btn-hover': '0 0 28px rgba(37, 99, 235, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
      },
    },
  },
  plugins: [],
};
