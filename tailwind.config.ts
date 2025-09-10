import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
        fadeInSoft: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOutSoft: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'expand-from-button': {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95) translateY(10px)',
            transformOrigin: 'bottom center'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1) translateY(0)',
            transformOrigin: 'bottom center'
          },
        },
        'collapse-to-button': {
          '0%': { 
            opacity: '1',
            transform: 'scale(1) translateY(0)',
            transformOrigin: 'bottom center'
          },
          '100%': { 
            opacity: '0',
            transform: 'scale(0.95) translateY(10px)',
            transformOrigin: 'bottom center'
          },
        },
        'highlight': {
          '0%': { 
            backgroundColor: 'rgba(251, 191, 36, 0)',
            boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)'
          },
          '50%': { 
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            boxShadow: '0 0 20px 10px rgba(251, 191, 36, 0.1)'
          },
          '100%': { 
            backgroundColor: 'rgba(251, 191, 36, 0)',
            boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)'
          },
        },
      },
      animation: {
        shimmer: 'shimmer 1s ease-in-out infinite',
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        fadeOut: 'fadeOut 0.3s ease-out forwards',
        'fade-in-fast': 'fadeIn 0.2s ease-out forwards',
        'fade-out-fast': 'fadeOut 0.2s ease-out forwards',
        'fade-in-soft': 'fadeInSoft 0.3s ease-out forwards',
        'fade-out-soft': 'fadeOutSoft 0.3s ease-out forwards',
        'fade-in-slow': 'fadeInSoft 0.5s ease-out forwards',
        'fade-out-slow': 'fadeOutSoft 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'expand-from-button': 'expand-from-button 0.3s ease-out forwards',
        'collapse-to-button': 'collapse-to-button 0.3s ease-out forwards',
        'highlight': 'highlight 2s ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config 