/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
          primary: {
            DEFAULT: '#14003D',
            50: '#f5f0f9',
            100: '#e8dff0',
            200: '#d1bfe1',
            300: '#ba9fd2',
            400: '#8c5fb4',
            500: '#6d4a8f',
            600: '#4e356a',
            700: '#2f2045',
            800: '#1a0f28',
            900: '#14003D',
            950: '#0d0026',
          },
          accent: {
            DEFAULT: '#7C3AED',
            50: '#f5f3ff',
          100: '#ede9fe',
        },
        success: {
          DEFAULT: '#16A34A',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          700: '#15803d',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          700: '#b45309',
        },
      },
    },
  },
  plugins: [],
}
