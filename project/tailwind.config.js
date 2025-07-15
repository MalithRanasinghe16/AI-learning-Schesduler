/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/components/Dashboard/**/*.{js,jsx,ts,tsx}',
    './src/components/Auth/**/*.{js,jsx,ts,tsx}',
    './src/contexts/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cyan: { 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4' },
        blue: { 500: '#3b82f6', 600: '#2563eb' },
        indigo: { 900: '#1e3a8a', 800: '#2c4b9b' },
        purple: { 900: '#4c1d95', 800: '#5b21b6' },
      },
    },
  },
  plugins: [],
};