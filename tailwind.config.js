/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Yellow color palette from Figma design
        primary: {
          DEFAULT: '#FFE500',
          50: '#FFFFCC',
          100: '#FFFFA3',
          200: '#FFFF7A',
          300: '#FFF751',
          400: '#FFEE28',
          500: '#FFE500',
          600: '#E6CE00',
          700: '#CCB700',
          800: '#B3A000',
          900: '#998900',
        },
        // Light blue background (from Figma)
        background: {
          DEFAULT: '#B3E5FC',
          light: '#E1F5FE',
          dark: '#81D4FA',
        },
        // Beige/cream colors (from Figma)
        cream: {
          DEFAULT: '#FAF8F3',
          light: '#FEFDFB',
          dark: '#F5F3ED',
        },
        // Black for text and buttons
        dark: {
          DEFAULT: '#000000',
          800: '#1A1A1A',
          700: '#333333',
        },
        // Status colors (yellow palette variations)
        status: {
          pending: '#FFF9C4',
          accepted: '#FFE082',
          verified: '#FFD54F',
          inTransit: '#FFCA28',
          delivered: '#FFC107',
          completed: '#B2FF59',
          cancelled: '#FFAB91',
          disputed: '#FF8A65',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['36px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['30px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['24px', { lineHeight: '1.4', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'strong': '0 8px 24px rgba(0, 0, 0, 0.16)',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}

