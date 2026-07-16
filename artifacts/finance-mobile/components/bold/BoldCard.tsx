import React from "react";
import { View, Pressable, ViewStyle, StyleSheet, LayoutChangeEvent } from "react-native";
import { useBoldColors } from "@/constants/themes";

export type BoldCardVariant = "default" | "elevated" | "outlined" | "filled";
export type BoldCardPadding = "none" | "sm" | "md" | "lg";

interface BoldCardProps {
  children: React.ReactNode;
  variant?: BoldCardVariant;
  padding?: BoldCardPadding;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}

const PADDING_SIZES: Record<BoldCardPadding, number> = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 20,
};

export function BoldCard({
  children,
  variant = "default",
  padding = "md",
  style,
  onPress,
  onLayout,
  testID,
}: BoldCardProps) {
  const colors = useBoldColors();
  const pad = PADDING_SIZES[padding];

  let backgroundColor: string;
  let borderWidth: number;
  let borderColor: string;

  switch (variant) {
    case "elevated":
      backgroundColor = colors.cardElevated;
      borderWidth = 0;
      borderColor = "transparent";
      break;
    case "outlined":
      backgroundColor = colors.card;
      borderWidth = 1;
      borderColor = colors.border;
      break;
    case "filled":
      backgroundColor = colors.surface;
      borderWidth = 0;
      borderColor = "transparent";
      break;
    default:
      backgroundColor = colors.card;
      borderWidth = 0;
      borderColor = "transparent";
  }

  const Container = onPress ? Pressable : View;

  return (
    <Container
      style={[
        styles.container,
        {
          backgroundColor,
          borderWidth,
          borderColor,
          padding: pad,
        },
        ...(Array.isArray(style) ? style : [style]),
      ] as ViewStyle[]}
      onPress={onPress}
      onLayout={onLayout}
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
      accessible={!!onPress}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
  },
});