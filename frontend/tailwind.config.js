/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 大地色系主题
        earth: {
          DEFAULT: '#8b7355',
          50: '#f5f3f0',
          100: '#e8dfd5',
          200: '#d4c4b0',
          300: '#a89f92',
          400: '#8b7355',
          500: '#6d5a44',
          600: '#5a4a38',
        },
        clay: {
          DEFAULT: '#a0826d',
          50: '#faf8f5',
          100: '#f0ebe5',
          200: '#e0d5ca',
          300: '#c4b5a5',
          400: '#a0826d',
          500: '#8a6f5c',
        },
        rust: {
          DEFAULT: '#b85845',
          50: '#fef5f3',
          100: '#fde8e4',
          200: '#fbd0c8',
          300: '#f7a89a',
          400: '#b85845',
          500: '#a04a3a',
          600: '#8a3f32',
        },
        sand: {
          DEFAULT: '#d4c4b0',
          50: '#faf8f5',
          100: '#f5f3f0',
          200: '#e8dfd5',
          300: '#d4c4b0',
        },
        amber: {
          DEFAULT: '#d4a574',
          50: '#fdf9f3',
          100: '#f9f0e3',
          200: '#f3e0c8',
          300: '#e8cca5',
          400: '#d4a574',
        },
        ink: {
          DEFAULT: '#2d2d2d',
          light: 'rgba(45, 45, 45, 0.85)',
          lighter: 'rgba(45, 45, 45, 0.65)',
          lightest: 'rgba(45, 45, 45, 0.45)',
        },
        paper: '#f5f3f0',
        cream: '#faf8f5',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        'card-hover': '0 4px 12px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'button': '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'button-hover': '0 4px 12px rgba(184, 88, 69, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        'input': '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'input-focus': '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)',
        'header': '0 2px 8px rgba(139, 115, 85, 0.08)',
      },
      borderRadius: {
        'card': '6px',
        'button': '6px',
        'input': '6px',
      },
      backdropBlur: {
        'glass': '20px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
}