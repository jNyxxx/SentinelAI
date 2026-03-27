/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './frontend/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0e1a',
          secondary: '#0f1629',
          card: '#111827',
          hover: '#1a2236',
          border: '#1e2d4a',
        },
        accent: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          green: '#10b981',
          red: '#ef4444',
          orange: '#f97316',
          yellow: '#eab308',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#475569',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(59,130,246,0.15)',
        'glow-red': '0 0 20px rgba(239,68,68,0.2)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
