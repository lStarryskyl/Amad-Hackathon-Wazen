import React, { forwardRef } from "react";
import { View, ViewStyle, TextInput, StyleSheet, TextStyle, TextInputProps } from "react-native";
import { BoldText } from "./BoldTypography";
import { useBoldColors } from "@/constants/themes";

export interface BoldInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  onChangeText?: (text: string) => void;
  value?: string;
  placeholder?: string;
  placeholderTextColor?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "number-pad" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: TextInputProps["autoComplete"];
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
}

export const BoldInput = forwardRef<TextInput, BoldInputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      disabled = false,
      style,
      onChangeText,
      value,
      placeholder,
      placeholderTextColor,
      secureTextEntry,
      keyboardType,
      autoCapitalize,
      autoComplete,
      onSubmitEditing,
      onFocus,
      onBlur,
      maxLength,
      multiline,
      numberOfLines,
      ...props
    },
    ref
  ) => {
    const colors = useBoldColors();
    const hasError = !!error;

    return (
      <View
        style={[
          styles.container,
          { width: fullWidth ? "100%" : undefined },
          style,
        ] as ViewStyle[]}
      >
        {label && (
          <BoldText
            variant="caption"
            style={[styles.label, { color: hasError ? colors.danger : colors.textSecondary }]}
          >
            {label}
          </BoldText>
        )}
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: disabled ? colors.surface : colors.background,
              borderColor: hasError ? colors.danger : colors.border,
              borderWidth: 1,
            },
          ] as ViewStyle[]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: colors.text, fontSize: 16 },
            ] as TextStyle[]}
            editable={!disabled}
            onChangeText={onChangeText}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            onSubmitEditing={onSubmitEditing}
            onFocus={onFocus}
            onBlur={onBlur}
            maxLength={maxLength}
            multiline={multiline}
            numberOfLines={numberOfLines}
            {...props}
          />
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
        {(error || helperText) && (
          <BoldText
            variant="caption"
            style={[
              styles.helperText,
              { color: hasError ? colors.danger : colors.mutedForeground },
            ]}
          >
            {error || helperText}
          </BoldText>
        )}
      </View>
    );
  }
);

BoldInput.displayName = "BoldInput";

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    minHeight: 52,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontWeight: "500",
  },
  helperText: {
    marginLeft: 4,
  },
});