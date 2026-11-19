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
          main: '#0B0F14',
          secondary: '#11161F',
          card: '#161C26',
        },
        accent: {
          cyan: '#22D3EE',
          'cyan-hover': '#67E8F9',
          'cyan-deep': '#06B6D4',
        },
        role: {
          owner: '#60A5FA',
          member: '#38BDF8',
          trial: '#FACC15',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#9CA7B8',
          muted: '#7A869A',
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
        'glass': '0 20px 48px -12px rgba(2, 6, 14, 0.65), inset 0 1px 0 0 rgba(255, 255, 255, 0.10)',
        'glass-sm': '0 10px 28px -8px rgba(2, 6, 14, 0.50), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'glow-cyan': '0 0 28px -4px rgba(34, 211, 238, 0.38)',
        'glow-owner': '0 0 28px -4px rgba(96, 165, 250, 0.35)',
        'glow-member': '0 0 28px -4px rgba(56, 189, 248, 0.35)',
        'glow-trial': '0 0 28px -4px rgba(250, 204, 21, 0.35)',
      },
      transitionTimingFunction: {
        'out-Quart': 'cubic-bezier(0.23, 1, 0.32, 1)',
      }
    },
  },
  plugins: [],
}
