/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#6d5efc', // Original accent
          600: '#5b4ef0',
          700: '#4c3ed8',
          800: '#3e31b0',
          900: '#2e2580',
          950: '#1e1850',
        },
      },
    },
  },
  plugins: [],
}
