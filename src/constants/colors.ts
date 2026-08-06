/**
 * Palette sampled from the app logo — an obsidian dragon wreathed in lava.
 * The logo's own pixels run a near-black-to-ember ramp (#030201 → #430a01)
 * topped by a #ff8300 lava highlight; these tokens are that ramp opened up
 * enough to keep UI surfaces and text legible.
 *
 * Mirrors the token names in tailwind.config.js. Screens should use NativeWind
 * classes (`bg-panel`, `text-accent`); this file is for the places that need a
 * raw value — native navigator chrome, ActivityIndicator, placeholder text.
 */
export const Colors = {
  background: "#0b0706",
  foreground: "#fff5ed",
  panel: "#17100d",
  panelRaised: "#211510",
  panelBorder: "#40271d",
  accent: "#ff6b1a",
  accentBright: "#ff9a4a",
  accentSoft: "#3a170b",
  accentForeground: "#1c0800",
  muted: "#c4a79d",
  subtle: "#80675f",
  success: "#59c991",
  danger: "#ff6b6b",
} as const;
