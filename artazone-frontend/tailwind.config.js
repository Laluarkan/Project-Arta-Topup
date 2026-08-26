/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0F0F12',
        violet: { 50:'#F5F1FF',100:'#EBE3FF',300:'#C7B3FF',500:'#7C3AED',600:'#6D28D9',700:'#5B21B6',900:'#2E1065' },
        gold: { 100:'#FEF9C3',300:'#FDE047',400:'#FACC15',500:'#EAB308' },
      },
      fontFamily: {
        display: ['Rajdhani','sans-serif'],
        body: ['"Plus Jakarta Sans"','sans-serif'],
      }
    },
  },
  plugins: [],
}