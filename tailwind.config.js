/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mars-red': '#dc2626',
        'mars-red-dark': '#991b1b',
        'mars-red-light': '#f87171',
        'mars-orange': '#ea580c',
        'mars-black': '#000000',
        'mars-gray': '#111111',
        'mars-gray-light': '#1f1f1f',
      },
    },
  },
  plugins: [],
} 