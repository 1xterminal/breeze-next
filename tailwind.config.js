/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.{js,css}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      backgroundImage: {
        'sky-bg': "url('/assets/images/sky_bg.png')",
        'gradient-main': "linear-gradient(135deg, var(--gradColorStart), var(--gradColorEnd))",
      }
    },
  },
  plugins: [],
}
