/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['attribute', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'neon-cyan':        '#22d3ee',
        'neon-cyan-dim':    'rgba(34,211,238,0.15)',
        'neon-cyan-mid':    'rgba(34,211,238,0.35)',
        'neon-cyan-full':   'rgba(34,211,238,0.8)',
        'neon-orange':      '#f97316',
        'neon-orange-dim':  'rgba(249,115,22,0.15)',
        'neon-blue':        '#0ea5e9',
        'neon-blue-mid':    'rgba(14,165,233,0.25)',
        'grid-color':       'rgba(34,211,238,0.04)',
        // Theme tokens — referenced via CSS vars so dark/light switching works at runtime
        't-bg':             'var(--t-bg)',
        't-bg-2':           'var(--t-bg-2)',
        't-bg-hover':       'var(--t-bg-hover)',
        't-bg-card':        'var(--t-bg-card)',
        't-bg-input':       'var(--t-bg-input)',
        't-bg-item':        'var(--t-bg-item)',
        't-text':           'var(--t-text)',
        't-text-muted':     'var(--t-text-muted)',
        't-text-dim':       'var(--t-text-dim)',
        't-border':         'var(--t-border)',
        't-border-soft':    'var(--t-border-soft)',
        't-border-med':     'var(--t-border-med)',
        't-shadow':         'var(--t-shadow)',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body:    ['Rajdhani', 'system-ui', 'sans-serif'],
        mono:    ['"Share Tech Mono"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'neon-cyan':      '0 0 8px #22d3ee, 0 0 20px rgba(34,211,238,0.4)',
        'neon-cyan-lg':   '0 0 12px #22d3ee, 0 0 30px rgba(34,211,238,0.5), 0 0 60px rgba(34,211,238,0.2)',
        'neon-orange':    '0 0 8px #f97316, 0 0 20px rgba(249,115,22,0.4)',
        'neon-orange-lg': '0 0 12px #f97316, 0 0 30px rgba(249,115,22,0.5)',
        'neon-blue':      '0 0 8px #0ea5e9, 0 0 20px rgba(14,165,233,0.4)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
