/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7B4F9B',
          'purple-light': '#9B6FB8',
          'purple-dark': '#5C3D76',
          'purple-bg': '#F4F0F6',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F8F8',
          border: '#E8E8E8',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        'card-lg': '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        navbar: '0 1px 0 rgba(0,0,0,0.08)',
      }
    }
  },
  plugins: []
};
