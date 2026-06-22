/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark fantasy ARPG codex palette (original, not derived from any game).
        obsidian: {
          950: '#08090b',
          900: '#0c0e12',
          800: '#12151b',
          700: '#181c24'
        },
        stone: {
          panel: '#1b1f27',
          card: '#20252f',
          raised: '#272d39',
          border: '#343b49'
        },
        bronze: {
          DEFAULT: '#a9803f',
          light: '#c79a55',
          dark: '#6f5326',
          dim: '#4a3a22'
        },
        copper: '#b87333',
        ember: {
          DEFAULT: '#d8531f',
          glow: '#ff7a3c'
        },
        crimson: {
          DEFAULT: '#8e2727',
          bright: '#c2342f',
          deep: '#5a1717'
        },
        ivory: {
          DEFAULT: '#e7e0d2',
          dim: '#b8b2a4',
          faint: '#8c887d'
        },
        gold: {
          pale: '#d8c79a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['Cinzel', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      boxShadow: {
        ember: '0 0 0 1px rgba(216,83,31,0.25), 0 0 18px -4px rgba(216,83,31,0.45)',
        rune: '0 0 0 1px rgba(169,128,63,0.35), 0 0 22px -8px rgba(169,128,63,0.5)',
        panel: '0 8px 30px -12px rgba(0,0,0,0.8)'
      },
      backgroundImage: {
        'codex-radial':
          'radial-gradient(1200px 600px at 50% -10%, rgba(169,128,63,0.08), transparent 60%), radial-gradient(900px 500px at 100% 100%, rgba(142,39,39,0.10), transparent 55%)'
      }
    }
  },
  plugins: []
}
