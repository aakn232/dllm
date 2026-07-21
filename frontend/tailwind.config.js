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
        chatBg: {
          dark: '#0f0f13',
          light: '#ffffff',
        },
        sidebarBg: {
          dark: '#17171e',
          light: '#f8f9fa',
        },
        userBubble: {
          dark: '#272732',
          light: '#e9ecef',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
        }
      }
    },
  },
  plugins: [],
}
