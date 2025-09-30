/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'control-room': {
          'bg': '#0a0a0a',
          'panel': '#1a1a1a',
          'border': '#2a2a2a',
          'accent': '#3a3a3a',
          'blue': '#1e40af',
          'cyan': '#0891b2',
          'green': '#16a34a',
          'yellow': '#ca8a04',
          'red': '#dc2626',
          'orange': '#ea580c',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}