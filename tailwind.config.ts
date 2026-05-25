import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // MistyOak přírodní paleta
        oak: {
          50:  '#EDF2E8',
          100: '#D4E4CA',
          200: '#B0CDA0',
          300: '#8DB576',
          400: '#6B9E4E',
          500: '#5C7A4E',  // primary
          600: '#4A6340',
          700: '#3A5230',
          800: '#2A3D22',
          900: '#1A2816',
        },
        birch: {
          50:  '#FDFAF5',
          100: '#F5F0E8',
          200: '#EDE5D4',
          300: '#DDD0B8',
          400: '#C8B898',
          500: '#B09878',
        },
        walnut: {
          50:  '#F9F2EA',
          100: '#F0E0CC',
          200: '#DFC4A0',
          300: '#C9A474',
          400: '#B0844E',
          500: '#7A5C3A',
          600: '#5E4529',
        },
        mist: {
          50:  '#F2F5F0',
          100: '#E8EEE6',
          200: '#D0DBCC',
          300: '#B0C0AB',
          400: '#8FA882',
          500: '#6B7F64',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}

export default config
