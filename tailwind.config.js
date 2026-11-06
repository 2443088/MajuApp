/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        dm: ['DMSans_400Regular'],
        'dm-medium': ['DMSans_500Medium'],
        'dm-semibold': ['DMSans_600SemiBold'],
        'dm-bold': ['DMSans_700Bold'],
        script: ['KaushanScript_400Regular'],
      },
    },
  },
  plugins: [],
};
