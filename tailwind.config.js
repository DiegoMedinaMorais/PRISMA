/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Tons tecnológicos e ambientais do PRISMA
        aqua: {
          50: '#e6fbff',
          100: '#c7f3fe',
          200: '#94e7fb',
          300: '#5ed6f7',
          400: '#2fbfef',
          500: '#0da2d6',
          600: '#0681b5',
          700: '#0a6792',
          800: '#0e5677',
          900: '#134864',
          950: '#072e44',
        },
        leaf: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        deep: {
          700: '#1e293b',
          800: '#16202e',
          900: '#0f172a',
          950: '#0a101d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(2, 6, 23, 0.06), 0 4px 16px -8px rgba(2, 6, 23, 0.18)',
      },
    },
  },
  plugins: [],
}
