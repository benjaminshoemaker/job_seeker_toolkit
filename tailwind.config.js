/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    // We already include a compiled preflight in src/index.css
    preflight: false,
  },
  theme: {
    extend: {},
  },
};

