/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CS2D Color System
        'cs-primary': '#ff6b00',
        'cs-secondary': '#00a8ff',
        'cs-success': '#00ff00',
        'cs-danger': '#ff0000',
        'cs-warning': '#ffaa00',
        'cs-dark': '#1a1a1a',
        'cs-gray': '#666666',
        'cs-light': '#f0f0f0',
        'cs-border': '#333333',
        'cs-background': '#0a0a0a',
        'cs-text': '#ffffff',
        // Team Colors
        'team-ct': '#0066cc',
        'team-t': '#cc6600',
        'team-spectator': '#999999'
      },
      fontFamily: {
        'cs': ['Counter-Strike', 'Arial', 'sans-serif'],
        'mono': ['Consolas', 'Monaco', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'damage-flash': 'damage-flash 0.3s ease-in-out',
        'reload': 'reload 2s ease-in-out',
        'defuse': 'defuse 10s linear',
        'plant': 'plant 3s ease-in-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-in'
      },
      keyframes: {
        'damage-flash': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(255, 0, 0, 0.3)' }
        },
        'reload': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'defuse': {
          '0%': { width: '0%' },
          '100%': { width: '100%' }
        },
        'plant': {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' }
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px'
      },
      backdropBlur: {
        xs: '2px'
      },
      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms'
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
    require('tailwindcss-animate'),
    // Custom plugin for game-specific utilities
    function({ addUtilities, addComponents, theme: _theme }) {
      addUtilities({
        '.text-shadow-cs': {
          textShadow: '0 0 10px rgba(255, 107, 0, 0.5)'
        },
        '.glow-cs': {
          filter: 'drop-shadow(0 0 10px rgba(255, 107, 0, 0.5))'
        },
        '.crosshair': {
          cursor: 'crosshair'
        }
      });
      
      addComponents({
        '.btn-cs': {
          '@apply px-4 py-2 bg-cs-primary text-white rounded hover:bg-opacity-80 transition-all duration-200 active:scale-95': {}
        },
        '.card-cs': {
          '@apply bg-cs-dark border border-cs-border rounded-lg p-4 hover:border-cs-primary transition-colors': {}
        },
        '.status-indicator': {
          '@apply w-2 h-2 rounded-full animate-pulse': {}
        }
      });
    }
  ]
}