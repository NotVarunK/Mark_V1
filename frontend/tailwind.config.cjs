/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          teal: '#0d4840',       // Deep teal background
          emerald: '#22b48c',    // Primary emerald accent / CTA
          secondary: '#4fcba3',  // Hover states / secondary highlights
          white: '#ffffff',      // Card surface
          glass: 'rgba(255, 255, 255, 0.07)', // Dark glass-style cards
        }
      },
      borderRadius: {
        'card': '16px',
      },
      boxShadow: {
        'card': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
