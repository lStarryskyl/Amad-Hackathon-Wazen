export const BoldColors = {
  light: {
    primary: "#0077BC",
    primaryLight: "#4DA8DA",
    primaryDark: "#005A9C",
    secondary: "#009866",
    secondaryLight: "#34D399",
    secondaryDark: "#007A52",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    accent: "#10B981",
    accentLight: "#34D399",
    surface: "#FFFFFF",
    surfaceElevated: "#F3F4F6",
    textPrimary: "#111827",
    textSecondary: "#4B5563",
    muted: "#9CA3AF",
    mutedForeground: "#9CA3AF",
    border: "#E5E7EB",
    borderLight: "#F3F4F6",
    background: "#F9FAFB",
    card: "#FFFFFF",
    cardElevated: "#F3F4F6",
    text: "#111827",
    primaryContainer: "#E0F2FE",
    secondaryContainer: "#DCFCE7",
    dangerContainer: "#FEF2F2",
    warningContainer: "#FFFBEB",
  },
  dark: {
    primary: "#4DA8DA",
    primaryLight: "#7EC4E4",
    primaryDark: "#2A91C9",
    secondary: "#34D399",
    secondaryLight: "#6EE7B7",
    secondaryDark: "#10B981",
    success: "#4ADE80",
    warning: "#FBBF24",
    danger: "#F87171",
    accent: "#10B981",
    accentLight: "#34D399",
    surface: "#111111",
    surfaceElevated: "#1F2937",
    textPrimary: "#F9FAFB",
    textSecondary: "#D1D5DB",
    muted: "#6B7280",
    mutedForeground: "#6B7280",
    border: "#374151",
    borderLight: "#1F2937",
    background: "#0A0E1A",
    card: "#111827",
    cardElevated: "#1F2937",
    text: "#F9FAFB",
    primaryContainer: "#1E3A5F",
    secondaryContainer: "#064E3B",
    dangerContainer: "#450A0A",
    warningContainer: "#451A03",
  },
} as const;

export type ColorMode = "light" | "dark";
export type ColorToken = keyof typeof BoldColors.light;

export const BoldTypography = {
  fontFamilies: {
    primary: "ArchivoBlack",
    display: "ArchivoBlack",
    mono: "JetBrainsMono",
  },
  weights: {
    thin: "100",
    extraLight: "200",
    light: "300",
    regular: "400",
    medium: "500",
    semiBold: "600",
    bold: "700",
    extraBold: "800",
    black: "900",
  },
  scale: {
    displayXL: { fontSize: 48, lineHeight: 53, fontWeight: "800", letterSpacing: -1 },
    displayLG: { fontSize: 36, lineHeight: 44, fontWeight: "800", letterSpacing: -0.5 },
    displayMD: { fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: 0 },
    heading1: { fontSize: 24, lineHeight: 32, fontWeight: "700", letterSpacing: 0 },
    heading2: { fontSize: 20, lineHeight: 28, fontWeight: "700", letterSpacing: 0 },
    heading3: { fontSize: 18, lineHeight: 26, fontWeight: "700", letterSpacing: 0 },
    bodyLG: { fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0 },
    bodyMD: { fontSize: 14, lineHeight: 21, fontWeight: "500", letterSpacing: 0 },
    bodySM: { fontSize: 13, lineHeight: 20, fontWeight: "500", letterSpacing: 0 },
    caption: { fontSize: 11, lineHeight: 16, fontWeight: "600", letterSpacing: 0.5 },
    button: { fontSize: 15, lineHeight: 18, fontWeight: "700", letterSpacing: 0 },
  },
} as const;

export const BoldSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

export const BoldRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
} as const;

export const BoldShadows = {
  light: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)",
  },
  dark: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.3)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)",
    md: "0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)",
    lg: "0 10px 15px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)",
    xl: "0 20px 25px rgba(0, 0, 0, 0.4), 0 10px 10px rgba(0, 0, 0, 0.3)",
  },
} as const;

export const BoldTouchTarget = 44;

export const BoldTransitions = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;

export const BoldZIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  toast: 500,
  tooltip: 600,
} as const;