import React from "react";
import { View, ViewStyle, TextStyle, StyleSheet } from "react-native";
import { BoldText } from "./BoldTypography";
import { useBoldColors } from "@/constants/themes";

export type BoldBadgeVariant = "default" | "success" | "warning" | "danger" | "primary" | "secondary";
export type BoldBadgeSize = "sm" | "md" | "lg";

interface BoldBadgeProps {
  children: React.ReactNode;
  variant?: BoldBadgeVariant;
  size?: BoldBadgeSize;
  style?: ViewStyle;
}

const VARIANT_COLORS: Record<BoldBadgeVariant, (colors: ReturnType<typeof useBoldColors>) => { bg: string; text: string }> = {
  default: (colors) => ({ bg: colors.muted, text: colors.textPrimary }),
  success: (colors) => ({ bg: colors.success + "20", text: colors.success }),
  warning: (colors) => ({ bg: colors.warning + "20", text: colors.warning }),
  danger: (colors) => ({ bg: colors.danger + "20", text: colors.danger }),
  primary: (colors) => ({ bg: colors.primary + "20", text: colors.primary }),
  secondary: (colors) => ({ bg: colors.secondary + "20", text: colors.secondary }),
};

const SIZE_STYLES: Record<BoldBadgeSize, { px: number; py: number; fontSize: number; borderRadius: number }> = {
  sm: { px: 6, py: 2, fontSize: 10, borderRadius: 6 },
  md: { px: 8, py: 3, fontSize: 11, borderRadius: 8 },
  lg: { px: 10, py: 4, fontSize: 12, borderRadius: 10 },
};

export function BoldBadge({ children, variant = "default", size = "md", style }: BoldBadgeProps) {
  const colors = useBoldColors();
  const variantColors = VARIANT_COLORS[variant](colors);
  const sizeStyle = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: sizeStyle.px,
          paddingVertical: sizeStyle.py,
          borderRadius: sizeStyle.borderRadius,
          backgroundColor: variantColors.bg,
        },
        style,
      ] as ViewStyle[]}
    >
      <BoldText
        variant="caption"
        style={[
          styles.text,
          { color: variantColors.text, fontSize: sizeStyle.fontSize },
        ] as TextStyle[]}
      >
        {children}
      </BoldText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontWeight: "700",
  },
});