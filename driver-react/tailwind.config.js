/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Choma brand colors (matching admin)
        choma: {
          white: '#FFFCFB',
          black: '#1D0C06',
          dark: '#212121',
          orange: '#F7AE1A',
          brown: '#652815',
        },
        // Use Choma colors as primary theme
        driver: {
          primary: '#F7AE1A', // Choma orange
          secondary: '#652815', // Choma brown
          success: '#27AE60',
          warning: '#F39C12',
          error: '#E74C3C',
          info: '#3498DB',
        },
        primary: {
          50: '#fefce8',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F7AE1A', // Choma orange as primary
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        secondary: {
          50: '#fdf4f3',
          100: '#fce7e6',
          200: '#f9d2cf',
          300: '#f4b2ac',
          400: '#ec8078',
          500: '#652815', // Choma brown as secondary
          600: '#5a2312',
          700: '#4a1e0f',
          800: '#3a190c',
          900: '#2d1409',
          950: '#1f0e06',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}