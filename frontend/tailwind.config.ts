import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Color palette — aged paper, hardcover books, walnut shelves, fountain pen ink
      colors: {
        paper: {
          DEFAULT: '#FAF8F5',
          dark: '#F0EDE8',
          darker: '#E5E0DB',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          light: '#4A4A4A',
          lighter: '#6B6B6B',
        },
        accent: {
          DEFAULT: '#8B4513',
          dark: '#6B3410',
          light: '#A65D2E',
        },
        border: {
          DEFAULT: '#E5E0DB',
          dark: '#D4CFC9',
        },
        muted: {
          DEFAULT: '#6B6B6B',
          light: '#9A9A9A',
        },
      },
      // Typography
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'Palatino Linotype', 'serif'],
        body: ['Inter', 'Avenir Next', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      // Type scale
      fontSize: {
        'hero': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['3.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h1': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h2': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['1rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'label': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'tiny': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      // Spacing scale (4px base)
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
        '40': '10rem',
        '48': '12rem',
        '64': '16rem',
        '96': '24rem',
      },
      // Max widths
      maxWidth: {
        'library': '1280px',
        'content': '720px',
        'narrow': '540px',
      },
      // Border radius
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',
        'DEFAULT': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
      },
      // Shadows
      boxShadow: {
        'book': '0 2px 8px rgba(26, 26, 26, 0.08)',
        'book-hover': '0 4px 16px rgba(26, 26, 26, 0.12)',
        'card': '0 1px 3px rgba(26, 26, 26, 0.06)',
        'card-hover': '0 4px 12px rgba(26, 26, 26, 0.1)',
      },
      // Animation
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-up': 'slideUp 300ms ease-out',
        'stagger': 'stagger 500ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        stagger: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
