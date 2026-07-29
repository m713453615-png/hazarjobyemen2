/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Alexandria', 'Inter', 'sans-serif'],
        latin: ['Inter', 'sans-serif'],
      },
      colors: {
        ink: '#07111f',
        panel: '#0d1b2c',
        gold: '#f4bd50',
        azure: '#4da3ff',
      },
      boxShadow: {
        glow: '0 18px 55px rgba(3, 10, 20, 0.28)',
      },
    },
  },
  plugins: [],
}
