/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        steel: {
          50: '#f5f7fa',
          100: '#e4e9f0',
          200: '#c8d3e0',
          300: '#9db3c9',
          400: '#6b8cae',
          500: '#4a6f92',
          600: '#3a5877',
          700: '#2c3e50',
          800: '#1e3a5f',
          900: '#0f1f33',
          950: '#0a1422',
        },
        industrial: {
          peak: '#e67e22',
          normal: '#27ae60',
          valley: '#3498db',
          danger: '#e74c3c',
          warning: '#f39c12',
          info: '#2980b9',
          success: '#27ae60',
        }
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'industrial': '4px 4px 0px 0px rgba(15, 31, 51, 0.9)',
        'industrial-sm': '2px 2px 0px 0px rgba(15, 31, 51, 0.9)',
        'industrial-lg': '6px 6px 0px 0px rgba(15, 31, 51, 0.9)',
        'industrial-hover': '2px 2px 0px 0px rgba(15, 31, 51, 0.9)',
      },
      borderWidth: {
        '3': '3px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'count-up': 'countUp 0.8s ease-out',
        'flow': 'flow 2s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
};
