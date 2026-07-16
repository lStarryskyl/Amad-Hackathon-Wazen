/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

export const Colors = {
  background: "#0A0E1A",
  card: "#111827",
  cardElevated: "#1F2937",
  primary: "#F59E0B",
  primaryLight: "#FCD34D",
  accent: "#10B981",
  accentLight: "#34D399",
  danger: "#EF4444",
  dangerLight: "#FCA5A5",
  warning: "#F59E0B",
  text: "#F9FAFB",
  textSecondary: "#D1D5DB",
  mutedForeground: "#9CA3AF",
  border: "#1F2937",
  borderLight: "#374151",
  surface: "#111827",
  surfaceElevated: "#1F2937",
};

export default {
  light: Colors,
  dark: Colors,
  radius: 8,
};
