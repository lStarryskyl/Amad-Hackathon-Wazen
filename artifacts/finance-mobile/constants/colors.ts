/**
 * Semantic design tokens — "Aurora" design language.
 *
 * Light mode: cool porcelain neutrals, indigo→violet gradient heroes, teal accent.
 * Dark mode: rich ink surfaces, luminous indigo, mint accent.
 *
 * Consumed via ThemeContext → useColors().
 */

export type ColorTokens = typeof LightColors;

export const LightColors = {
  background:     "#F6F7FB",   // Cool porcelain
  card:           "#FFFFFF",
  cardElevated:   "#EEF0F8",   // Lavender-tinted panel

  primary:        "#4F46E5",   // Indigo
  primaryLight:   "#6366F1",
  primaryForeground:"#FFFFFF",

  accent:         "#0D9488",   // Deep teal
  accentLight:    "#14B8A6",
  danger:         "#E11D48",   // Rose
  dangerLight:    "#FB7185",
  warning:        "#D97706",   // Amber

  text:           "#101322",   // Ink
  textSecondary:  "#3F4457",
  mutedForeground:"#7A8095",

  border:         "#E4E6F0",
  borderLight:    "#D3D7E5",

  surface:        "#FFFFFF",
  surfaceElevated:"#EEF0F8",

  // Gradient pair used by hero cards and primary buttons
  gradientStart:  "#4F46E5",
  gradientEnd:    "#7C3AED",
  // Foreground colors rendered on top of the gradient
  onGradient:     "#FFFFFF",
  onGradientMuted:"rgba(255,255,255,0.72)",
};

export const DarkColors: ColorTokens = {
  background:     "#0B0D14",   // Rich ink
  card:           "#141726",
  cardElevated:   "#1D2136",

  primary:        "#818CF8",   // Luminous indigo
  primaryLight:   "#A5B4FC",
  primaryForeground:"#0B0D14",

  accent:         "#2DD4BF",   // Mint
  accentLight:    "#5EEAD4",
  danger:         "#FB7185",
  dangerLight:    "#FDA4AF",
  warning:        "#FBBF24",

  text:           "#EEF0FA",
  textSecondary:  "#A9AFC4",
  mutedForeground:"#6E7488",

  border:         "#262B40",
  borderLight:    "#343A55",

  surface:        "#141726",
  surfaceElevated:"#1D2136",

  gradientStart:  "#4338CA",
  gradientEnd:    "#7C3AED",
  onGradient:     "#FFFFFF",
  onGradientMuted:"rgba(255,255,255,0.72)",
};

export const Colors = LightColors;

/** Shared shape scale — keeps radii consistent across the app. */
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
};

export default {
  light: LightColors,
  dark:  DarkColors,
  radius: 12,
};
