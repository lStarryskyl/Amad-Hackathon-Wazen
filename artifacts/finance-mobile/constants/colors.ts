/**
 * Semantic design tokens for the mobile app.
 *
 * Corporate palette — navy/slate primaries, controlled blue accent,
 * clean whites. Replaces the consumer amber/orange scheme with a
 * trust-signal institutional design language (Bloomberg / Fidelity tone).
 *
 * To add light mode, add a `light` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: "#0D1117",       // Deep professional dark
  card: "#161B22",             // Primary surface elevation
  cardElevated: "#1C2128",     // Secondary surface elevation

  // ── Brand / Actions ───────────────────────────────────────────────────────
  primary: "#2563EB",          // Corporate blue — primary CTA & highlights
  primaryLight: "#3B82F6",     // Lighter blue for hover states

  // ── Semantic Status ───────────────────────────────────────────────────────
  accent: "#10B981",           // Emerald green — positive / success
  accentLight: "#34D399",      // Lighter success
  danger: "#F85149",           // Corporate red — errors / risk
  dangerLight: "#FCA5A5",      // Light danger
  warning: "#D29922",          // Muted amber — caution (not primary)

  // ── Typography ────────────────────────────────────────────────────────────
  text: "#E6EDF3",             // Cool white — primary body copy
  textSecondary: "#8B949E",    // Grey-blue — secondary labels
  mutedForeground: "#6E7681",  // Subdued text / placeholders

  // ── Borders & Dividers ────────────────────────────────────────────────────
  border: "#30363D",           // Standard separator
  borderLight: "#3D444D",      // Lighter separator

  // ── Aliases ───────────────────────────────────────────────────────────────
  surface: "#161B22",
  surfaceElevated: "#1C2128",
};

export default {
  light: Colors,
  dark: Colors,
  radius: 6,
};
