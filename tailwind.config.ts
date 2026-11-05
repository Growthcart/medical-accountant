import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/(cms)/**/*.{js,ts,jsx,tsx,mdx}',
    './components/admin/**/*.{js,ts,jsx,tsx,mdx}',
    './components/blog-cms/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-figtree)', 'sans-serif'],
        display: ['var(--font-figtree)', 'sans-serif'],
      },
      fontSize: {
        // Section heading used across services / SEO / industry pages.
        // Tuple form sets fontSize + lineHeight in one utility.
        section: ['40px', { lineHeight: '48px' }],
      },
      colors: {
        dark: {
          DEFAULT: '#111827',
          50: '#1f2937',
          100: '#1a202c',
          200: '#161b26',
          300: '#131720',
          400: '#111827',
        },
        orange: {
          DEFAULT: '#ff642d',
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#ff642d',
          500: '#e11d48',
          600: '#be123c',
          700: '#9f1239',
        },
        coral: {
          DEFAULT: '#FF6B4A',
          50: '#FFE5DF',
          100: '#FFCFC4',
          200: '#FFB5A5',
          300: '#FF9A85',
          400: '#FF8268',
          500: '#FF6B4A',
          600: '#E85535',
        },
        // Neutral surface palette — replaces ad-hoc arbitrary hex values used
        // for backgrounds and dark sections across the site.
        surface: {
          50: '#FAFAFA',   // page wash
          100: '#f5f5f7',  // light section / muted card
          200: '#f9fafb',  // subtle surface
          800: '#1a1a1a',  // body text on light bg / dark section bg
          900: '#0a0a0a',  // deepest dark section bg
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #111827 0%, #161b26 50%, #131720 100%)',
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
      boxShadow: {
        'glow-orange': '0 0 60px -12px rgba(255, 100, 45, 0.4)',
        'glow-coral': '0 0 60px -12px rgba(255, 107, 74, 0.4)',
        'card': '0 24px 48px -12px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}

export default config
