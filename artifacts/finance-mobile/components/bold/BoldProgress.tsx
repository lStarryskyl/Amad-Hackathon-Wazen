import React from "react";
import { View, ViewStyle, StyleSheet, Animated } from "react-native";
import { useBoldColors } from "@/constants/themes";
import { BoldText } from "./BoldTypography";

export type BoldProgressVariant = "default" | "success" | "warning" | "danger";
export type BoldProgressSize = "sm" | "md" | "lg";

interface BoldProgressProps {
  value: number;
  max?: number;
  variant?: BoldProgressVariant;
  size?: BoldProgressSize;
  animated?: boolean;
  style?: ViewStyle;
  showLabel?: boolean;
}

const SIZE_HEIGHTS: Record<BoldProgressSize, number> = {
  sm: 4,
  md: 8,
  lg: 12,
};

const VARIANT_COLORS: Record<BoldProgressVariant, (colors: ReturnType<typeof useBoldColors>) => string> = {
  default: (colors) => colors.primary,
  success: (colors) => colors.success,
  warning: (colors) => colors.warning,
  danger: (colors) => colors.danger,
};

export function BoldProgress({
  value,
  max = 100,
  variant = "default",
  size = "md",
  animated = true,
  style,
  showLabel = false,
}: BoldProgressProps) {
  const colors = useBoldColors();
  const height = SIZE_HEIGHTS[size];
  const progressColor = VARIANT_COLORS[variant](colors);
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const progressWidth = new Animated.Value(0);

  React.useEffect(() => {
    if (animated) {
      Animated.timing(progressWidth, {
        toValue: percentage,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      progressWidth.setValue(percentage);
    }
  }, [percentage, animated, progressWidth]);

  const animatedWidth = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, { gap: 4 }, style] as ViewStyle[]}>
      <View style={[styles.track, { height, backgroundColor: colors.border }] as ViewStyle[]}>
        <Animated.View
          style={[
            styles.fill,
            { height: "100%", backgroundColor: progressColor, borderRadius: height / 2 },
            { width: animatedWidth },
          ] as ViewStyle[]}
        />
      </View>
      {showLabel && (
        <View style={styles.labelRow}>
          <BoldText variant="caption" color={colors.mutedForeground}>
            {Math.round(percentage)}%
          </BoldText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  track: {
    borderRadius: 9999,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 9999,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});