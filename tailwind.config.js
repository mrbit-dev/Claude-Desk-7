/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        claude: {
          50: 'rgb(var(--claude-50) / <alpha-value>)',
          100: 'rgb(var(--claude-100) / <alpha-value>)',
          200: 'rgb(var(--claude-200) / <alpha-value>)',
          300: 'rgb(var(--claude-300) / <alpha-value>)',
          400: 'rgb(var(--claude-400) / <alpha-value>)',
          500: 'rgb(var(--claude-500) / <alpha-value>)',
          600: 'rgb(var(--claude-600) / <alpha-value>)',
          700: 'rgb(var(--claude-700) / <alpha-value>)',
          800: 'rgb(var(--claude-800) / <alpha-value>)',
          900: 'rgb(var(--claude-900) / <alpha-value>)',
          950: 'rgb(var(--claude-950) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
