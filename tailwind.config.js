/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#101216',
          secondary: '#161A20',
          card: '#1C2027',
        },
        accent: {
          orange: '#F08A36',
          'orange-hover': '#F59B50',
        },
        role: {
          owner: '#60A5FA',
          member: '#38BDF8',
          trial: '#FACC15',
        },
        text: {
          primary: '#F1F1EE',
          secondary: '#92969E',
          muted: '#646973',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.16)',
        }
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        pixel: ['"Silkscreen"', 'monospace'],
      },
      boxShadow: {
        'glass': '0 20px 48px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.09)',
        'glass-sm': '0 10px 28px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'glow-orange': '0 0 28px -4px rgba(240, 138, 54, 0.35)',
        'glow-owner': '0 0 28px -4px rgba(96, 165, 250, 0.35)',
        'glow-member': '0 0 28px -4px rgba(56, 189, 248, 0.35)',
        'glow-trial': '0 0 28px -4px rgba(250, 204, 21, 0.35)',
      },
      transitionTimingFunction: {
        'out-Quart': 'cubic-bezier(0.2, 0, 0, 1)',
      }
    },
  },
  plugins: [],
}
