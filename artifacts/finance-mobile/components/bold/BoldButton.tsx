import React, { forwardRef } from "react";
import { TouchableOpacity, ViewStyle, TextStyle, StyleSheet } from "react-native";
import { BoldButtonText } from "./BoldTypography";
import { useBoldColors } from "@/constants/themes";
import { useBoldHaptics } from "@/hooks/useBoldHaptics";

export type BoldButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type BoldButtonSize = "sm" | "md" | "lg" | "xl";

interface BoldButtonProps extends React.ComponentPropsWithoutRef<typeof TouchableOpacity> {
  variant?: BoldButtonVariant;
  size?: BoldButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  onPress?: () => void;
}

const SIZE_STYLES: Record<BoldButtonSize, { height: number; paddingHorizontal: number; fontSize: number; borderRadius: number }> = {
  sm: { height: 40, paddingHorizontal: 16, fontSize: 13, borderRadius: 10 },
  md: { height: 48, paddingHorizontal: 20, fontSize: 15, borderRadius: 12 },
  lg: { height: 56, paddingHorizontal: 24, fontSize: 16, borderRadius: 14 },
  xl: { height: 64, paddingHorizontal: 32, fontSize: 18, borderRadius: 16 },
};

const VARIANT_STYLES: Record<BoldButtonVariant, (colors: ReturnType<typeof useBoldColors>) => { backgroundColor: string; borderColor: string; textColor: string }> = {
  primary: (colors) => ({
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    textColor: "#FFFFFF",
  }),
  secondary: (colors) => ({
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
    textColor: "#FFFFFF",
  }),
  ghost: (colors) => ({
    backgroundColor: "transparent",
    borderColor: "transparent",
    textColor: colors.primary,
  }),
  danger: (colors) => ({
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    textColor: "#FFFFFF",
  }),
  outline: (colors) => ({
    backgroundColor: "transparent",
    borderColor: colors.border,
    textColor: colors.text,
  }),
};

export const BoldButton = forwardRef<React.ElementRef<typeof TouchableOpacity>, BoldButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      onPress,
      disabled,
      style,
      hitSlop,
      ...props
    },
    ref
  ) => {
    const colors = useBoldColors();
    const { lightImpact } = useBoldHaptics();
    const sizeStyle = SIZE_STYLES[size];
    const variantStyle = VARIANT_STYLES[variant](colors);
    const isDisabled = disabled || loading;

    const handlePress = () => {
      if (!isDisabled && onPress) {
        lightImpact();
        onPress();
      }
    };

    return (
      <TouchableOpacity
        ref={ref}
        style={[
          styles.container,
          {
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            borderRadius: sizeStyle.borderRadius,
            backgroundColor: isDisabled ? colors.muted : variantStyle.backgroundColor,
            borderWidth: variant === "outline" ? 2 : 0,
            borderColor: isDisabled ? colors.border : variantStyle.borderColor,
            width: fullWidth ? "100%" : undefined,
          },
          style,
        ] as ViewStyle[]}
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.85}
        hitSlop={hitSlop || { top: 8, bottom: 8, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        {...props}
      >
        {loading ? (
          <BoldButtonText style={[styles.loadingText, { color: variantStyle.textColor }]}>
            Loading...
          </BoldButtonText>
        ) : (
          <React.Fragment>
            {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
            <BoldButtonText
              style={[
                styles.text,
                { color: isDisabled ? colors.mutedForeground : variantStyle.textColor, fontSize: sizeStyle.fontSize },
              ]}
            >
              {children}
            </BoldButtonText>
            {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
          </React.Fragment>
        )}
      </TouchableOpacity>
    );
  }
);

BoldButton.displayName = "BoldButton";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    textAlign: "center",
  },
  loadingText: {
    textAlign: "center",
  },
});