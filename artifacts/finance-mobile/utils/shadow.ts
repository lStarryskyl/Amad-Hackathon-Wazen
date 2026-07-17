import { Platform, ViewStyle } from "react-native";

/**
 * Returns platform-appropriate shadow styles.
 * On web: uses the CSS `boxShadow` property to avoid RN Web deprecation warnings.
 * On iOS/Android: uses native shadowColor/shadowOffset/shadowOpacity/shadowRadius + elevation.
 */
export function shadow(opts: {
  color?: string;
  offsetX?: number;
  offsetY?: number;
  opacity: number;
  radius: number;
  elevation?: number;
}): ViewStyle {
  const {
    color = "#000",
    offsetX = 0,
    offsetY = 4,
    opacity,
    radius,
    elevation = 0,
  } = opts;

  if (Platform.OS === "web") {
    if (opacity === 0) return {};
    // Expand 3-digit hex (#000 → #000000, #abc → #aabbcc) before parsing
    let hex = color.replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px rgba(${r},${g},${b},${opacity})`,
    } as ViewStyle;
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    ...(elevation > 0 ? { elevation } : {}),
  };
}

/**
 * Clears any shadow — use in disabled or transparent button overrides.
 * On web sets boxShadow: "none" so it overrides a parent boxShadow.
 * On native sets shadowOpacity: 0.
 */
export const noShadow: ViewStyle =
  Platform.OS === "web"
    ? ({ boxShadow: "none" } as ViewStyle)
    : { shadowOpacity: 0 };
