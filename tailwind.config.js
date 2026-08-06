/** @type {import('tailwindcss').Config} */
// Keep in sync with src/constants/colors.ts — same palette, sampled from the
// app logo (obsidian dragon in lava).
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0b0706",
        foreground: "#fff5ed",
        panel: "#17100d",
        "panel-raised": "#211510",
        "panel-border": "#40271d",
        accent: "#ff6b1a",
        "accent-bright": "#ff9a4a",
        "accent-soft": "#3a170b",
        "accent-foreground": "#1c0800",
        muted: "#c4a79d",
        subtle: "#80675f",
        success: "#59c991",
        danger: "#ff6b6b",
      },
    },
  },
  plugins: [],
};
