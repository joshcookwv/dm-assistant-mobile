/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#16130f",
        foreground: "#f2ead9",
        panel: "#211c15",
        "panel-border": "#3a3225",
        accent: "#d99a3f",
        "accent-foreground": "#1a1408",
        muted: "#a89a80",
      },
    },
  },
  plugins: [],
};
