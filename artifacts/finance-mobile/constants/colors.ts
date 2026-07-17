/**
 * Semantic design tokens — organic, warm, and intentional palette.
 *
 * Light mode is primary: warm eggshell, deep pine, terracotta.
 * Dark mode: deep charcoal, muted copper, sage.
 *
 * Consumed via ThemeContext → useColors().
 */

export type ColorTokens = typeof LightColors;

export const LightColors = {
  background:     "#FBF9F6",   // Warm eggshell/sand
  card:           "#FFFFFF",
  cardElevated:   "#F3EFE7",   // Slightly darker sand
  
  primary:        "#2C4C3B",   // Deep Pine
  primaryLight:   "#3E6A53",   // Lighter pine
  primaryForeground:"#FFFFFF",

  accent:         "#3A7D44",   // Organic green
  accentLight:    "#4B9F5A",
  danger:         "#C04A3B",   // Rust / Terracotta
  dangerLight:    "#D97669",
  warning:        "#D48C29",   // Ochre

  text:           "#1C211F",   // Very dark green-black
  textSecondary:  "#545E59",   // Charcoal
  mutedForeground:"#8A948F",   // Muted sage

  border:         "#E6E1D6",   // Soft beige border
  borderLight:    "#D4CEBF",
  
  surface:        "#FFFFFF",
  surfaceElevated:"#F3EFE7",
};

export const DarkColors: ColorTokens = {
  background:     "#151716",   // Deep charcoal
  card:           "#1D201E",
  cardElevated:   "#272B29",
  
  primary:        "#D48C70",   // Soft clay/copper for dark mode
  primaryLight:   "#E2A68F",
  primaryForeground:"#151716",

  accent:         "#53A561",
  accentLight:    "#6CBD7B",
  danger:         "#D65E50",
  dangerLight:    "#E28B81",
  warning:        "#E8A843",

  text:           "#EBEFEB",
  textSecondary:  "#A1ADA7",
  mutedForeground:"#6C7672",

  border:         "#303633",
  borderLight:    "#3E4743",
  
  surface:        "#1D201E",
  surfaceElevated:"#272B29",
};

export const Colors = LightColors;

export default {
  light: LightColors,
  dark:  DarkColors,
  radius: 12,
};
