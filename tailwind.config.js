/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        claude: {
          50: '#f0f0f3',
          100: '#d9d8e2',
          200: '#b3b1c5',
          300: '#8d8aa8',
          400: '#67638b',
          500: '#4a4670',
          600: '#3b385a',
          700: '#2c2a44',
          800: '#1d1c2e',
          900: '#0e0e18',
          950: '#07070d',
        },
        accent: {
          DEFAULT: '#d4a574',
          light: '#e0bc94',
          dark: '#c08e54',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
