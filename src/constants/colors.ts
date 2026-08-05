/**
 * Mirrors the color tokens in tailwind.config.js. Screen content should use
 * NativeWind className (e.g. `bg-panel`, `text-accent`) instead of these —
 * this file exists only for native navigator chrome (headers, drawer) that
 * takes style objects rather than classNames.
 */
export const Colors = {
  background: "#16130f",
  foreground: "#f2ead9",
  panel: "#211c15",
  panelBorder: "#3a3225",
  accent: "#d99a3f",
  accentForeground: "#1a1408",
  muted: "#a89a80",
} as const;
