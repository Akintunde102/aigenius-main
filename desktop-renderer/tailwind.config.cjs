const frontendTailwind = require('../frontend/tailwind.config.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...frontendTailwind,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../frontend/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
};
