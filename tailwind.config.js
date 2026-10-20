/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070C1A',
          900: '#0B132B',
          850: '#101B3B',
          800: '#16244C',
          700: '#1E3264',
          600: '#284380',
        },
        gold: {
          50: '#FAF6EE',
          100: '#F4EBD8',
          200: '#EBD8B1',
          300: '#DFC287',
          400: '#D4AF57',
          500: '#C5A059',
          600: '#A9833F',
          700: '#87642D',
          800: '#674B23',
          900: '#4D361B',
        },
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        platinum: {
          50: '#FAFAFB',
          100: '#F4F5F8',
          200: '#E8EAEE',
          300: '#D5D8DF',
          400: '#9CA3AF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

