import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Clash Display', 'Syne', 'Georgia', 'serif'],
        body: ['DM Sans', 'Nunito', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        surface: 'var(--color-surface)',
        muted: 'var(--color-muted)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'price-pulse': 'pricePulse 2s ease-in-out infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pricePulse: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.05)' } },
        skeleton: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)',
        'price': '0 4px 16px rgba(249,115,22,0.25)',
      },
    },
  },
  plugins: [],
}

export default config
