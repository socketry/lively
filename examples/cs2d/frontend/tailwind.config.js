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
        'mono': ['Consolas', 'Monaco', 'monospace'],
        'pixel': ['Press Start 2P', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'damage-flash': 'damage-flash 0.3s ease-in-out',
        'reload': 'reload 2s ease-in-out',
        'defuse': 'defuse 10s linear',
        'plant': 'plant 3s ease-in-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-in',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'blob': 'blob 7s infinite',
        'float': 'float 3s ease-in-out infinite'
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
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'blob': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
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
        },
        // Pixel Art utilities
        '.pixel-art': {
          imageRendering: 'pixelated'
        },
        '.pixel-font': {
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '8px',
          lineHeight: '1.5',
          textRendering: 'optimizeSpeed',
          imageRendering: 'pixelated',
          WebkitFontSmoothing: 'none',
          MozOsxFontSmoothing: 'unset'
        },
        '.pixel-border': {
          border: '3px solid',
          borderImageSource: 'url("data:image/svg+xml,%3csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'m0,0 L100,0 L100,100 L0,100 Z\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'4\'/%3e%3c/svg%3e")',
          borderImageSlice: '4',
          borderImageWidth: '4px'
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
        },
        // Pixel Components
        '.pixel-button': {
          '@apply font-pixel pixel-art text-white cursor-pointer transition-none py-2 px-4 min-h-8 min-w-16 text-xs': {},
          background: 'linear-gradient(145deg, #5a9fd4 0%, #306998 100%)',
          border: '3px solid',
          borderColor: '#7bb3e0 #1e4b66 #1e4b66 #7bb3e0',
          textShadow: '1px 1px 0px #000',
          '&:hover': {
            background: 'linear-gradient(145deg, #6bb0e5 0%, #4179a9 100%)',
            borderColor: '#8cc4f1 #2f5c77 #2f5c77 #8cc4f1'
          },
          '&:active': {
            background: 'linear-gradient(145deg, #306998 0%, #5a9fd4 100%)',
            borderColor: '#1e4b66 #7bb3e0 #7bb3e0 #1e4b66'
          }
        },
        '.pixel-panel': {
          '@apply pixel-art p-4': {},
          background: 'linear-gradient(145deg, #3a3a3a 0%, #1a1a1a 100%)',
          border: '3px solid',
          borderColor: '#666 #333 #333 #666',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-3px',
            left: '-3px',
            right: '-3px',
            bottom: '-3px',
            border: '1px solid #888',
            pointerEvents: 'none'
          }
        },
        '.pixel-input': {
          '@apply font-pixel pixel-art w-full bg-black text-green-400 p-2 outline-none': {},
          border: '3px solid',
          borderColor: '#333 #666 #666 #333',
          caretColor: '#00ff00',
          '&::placeholder': {
            color: '#555'
          },
          '&:focus': {
            borderColor: '#00ff00 #00aa00 #00aa00 #00ff00',
            boxShadow: '0 0 8px rgba(0, 255, 0, 0.4)'
          }
        },
        '.pixel-title': {
          '@apply font-pixel text-white text-base': {},
          textShadow: '2px 2px 0px #000',
          letterSpacing: '2px'
        },
        '.pixel-text': {
          '@apply font-pixel text-white text-xs': {},
          letterSpacing: '1px'
        },
        // Mobile-specific components
        '.mobile-touch-target': {
          '@apply min-h-[44px] min-w-[44px]': {}
        },
        '.mobile-input': {
          '@apply text-base': {},
          fontSize: '16px' // Prevents zoom on iOS
        },
        '.mobile-safe-area': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        },
        '.mobile-sticky-bottom': {
          position: 'sticky',
          bottom: 'env(safe-area-inset-bottom)',
          zIndex: '50'
        },
        '.scrollable-content': {
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }
      });
    }
  ]
}
