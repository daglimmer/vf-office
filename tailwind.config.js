/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vf: {
          bg: '#040811',
          panel: '#080c18',
          border: '#1a3355',
          accent: '#00ccff',
          warn: '#ffaa00',
          danger: '#ff3355',
          success: '#00ff88',
          muted: '#556688',
          text: '#c8d0e0',
          bright: '#e0e8f8',
          // Neon cyberpunk accents
          neon: {
            cyan: '#00ccff',
            blue: '#4488ff',
            purple: '#8844ff',
            magenta: '#ff00ff',
            red: '#ff0044',
            orange: '#ff6600',
            amber: '#ffaa00',
            green: '#00ff88',
            pink: '#ff4488',
          },
          // Darker variants for panels and backgrounds
          deep: {
            blue: '#0a1528',
            purple: '#150a28',
            black: '#040811',
          },
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
