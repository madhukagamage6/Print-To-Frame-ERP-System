/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Hanken Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'surface': '#0b0e14',
        'surface-dim': '#090b10',
        'surface-bright': '#151a24',
        'surface-container-lowest': '#06080a',
        'surface-container-low': '#0b0e14',
        'surface-container': '#121822',
        'surface-container-high': '#1a2230',
        'surface-container-highest': '#232e42',
        'on-surface': '#f4f4f5',
        'on-surface-variant': '#a1a1aa',
        'outline': '#384661',
        'outline-variant': '#1e2838',
        'primary': '#00daf3',
        'on-primary': '#000000',
        'primary-container': '#00daf3',
        'on-primary-container': '#000000',
        'secondary': '#34d399',
        'on-secondary': '#000000',
        'error': '#fca5a5',
        'on-error': '#450a0a',
        'error-container': '#7f1d1d',
        'on-error-container': '#fecaca',
        'primary-fixed': '#00daf3',
      }
    },
  },
  plugins: [],
}
