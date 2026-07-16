/**
 * Semantic design tokens — Slate + Teal corporate palette.
 *
 * Light mode is primary (Robinhood-meets-Fidelity aesthetic):
 * clean whites, slate-grey text, teal as the trust-signal accent.
 *
 * Dark mode mirrors the same semantic slots on a deep-slate canvas
 * so colours feel purposeful rather than inverted.
 *
 * Consumed via ThemeContext → useColors().
 */

export type ColorTokens = typeof LightColors;

// ── Light (primary) ──────────────────────────────────────────────────────────
export const LightColors = {
  // Backgrounds
  background:     "#F8FAFC",   // slate-50
  card:           "#FFFFFF",   // pure white cards
  cardElevated:   "#F1F5F9",   // slate-100 — subtle lift

  // Brand / actions
  primary:            "#0D9488",   // teal-600 — CTAs, active states
  primaryLight:       "#14B8A6",   // teal-500 — hover / lighter variant
  primaryForeground:  "#FFFFFF",   // text/icon on top of primary bg

  // Semantic status
  accent:         "#059669",   // emerald-600 — positive / income / success
  accentLight:    "#10B981",   // emerald-500
  danger:         "#DC2626",   // red-600   — errors / high-risk
  dangerLight:    "#FCA5A5",   // red-300   — soft danger tint
  warning:        "#D97706",   // amber-600 — caution (muted, not primary)

  // Typography
  text:           "#0F172A",   // slate-900 — primary body copy
  textSecondary:  "#475569",   // slate-600 — secondary labels
  mutedForeground:"#94A3B8",   // slate-400 — placeholders / timestamps

  // Borders & dividers
  border:         "#E2E8F0",   // slate-200
  borderLight:    "#CBD5E1",   // slate-300

  // Surface aliases
  surface:        "#FFFFFF",
  surfaceElevated:"#F8FAFC",
};

// ── Dark (secondary) ─────────────────────────────────────────────────────────
export const DarkColors: ColorTokens = {
  // Backgrounds
  background:     "#0F172A",   // slate-900
  card:           "#1E293B",   // slate-800
  cardElevated:   "#334155",   // slate-700

  // Brand / actions
  primary:            "#14B8A6",   // teal-500  — slightly lighter for dark bg
  primaryLight:       "#2DD4BF",   // teal-400
  primaryForeground:  "#FFFFFF",   // text/icon on top of primary bg

  // Semantic status
  accent:         "#10B981",   // emerald-500
  accentLight:    "#34D399",   // emerald-400
  danger:         "#F87171",   // red-400   — softer on dark
  dangerLight:    "#FCA5A5",
  warning:        "#FBBF24",   // amber-400

  // Typography
  text:           "#F1F5F9",   // slate-100
  textSecondary:  "#94A3B8",   // slate-400
  mutedForeground:"#64748B",   // slate-500

  // Borders & dividers
  border:         "#334155",   // slate-700
  borderLight:    "#475569",   // slate-600

  // Surface aliases
  surface:        "#1E293B",
  surfaceElevated:"#334155",
};

// Legacy default export (used by tabs _layout and any place that
// hasn't migrated to useColors() yet).  Prefer useColors().
export const Colors = LightColors;

export default {
  light: LightColors,
  dark:  DarkColors,
  radius: 12,
};
