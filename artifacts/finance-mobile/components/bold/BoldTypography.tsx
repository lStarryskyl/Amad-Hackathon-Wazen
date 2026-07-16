import React from "react";
import { Text, TextStyle, ViewStyle } from "react-native";
import { useBoldColors } from "@/constants/themes";

type FontWeight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

interface BoldTypographyProps extends React.ComponentProps<typeof Text> {
  variant?: "displayXL" | "displayLG" | "displayMD" | "heading1" | "heading2" | "heading3" | "bodyLG" | "bodyMD" | "bodySM" | "caption" | "button";
  weight?: FontWeight;
  color?: string;
  lineHeight?: number;
  children: React.ReactNode;
}

const TYPOGRAPHY = {
  displayXL: { fontSize: 48, lineHeight: 53, fontWeight: "800" as FontWeight, letterSpacing: -0.5 },
  displayLG: { fontSize: 36, lineHeight: 43, fontWeight: "800" as FontWeight, letterSpacing: -0.3 },
  displayMD: { fontSize: 28, lineHeight: 34, fontWeight: "800" as FontWeight, letterSpacing: -0.2 },
  heading1: { fontSize: 24, lineHeight: 31, fontWeight: "700" as FontWeight },
  heading2: { fontSize: 20, lineHeight: 26, fontWeight: "700" as FontWeight },
  heading3: { fontSize: 18, lineHeight: 25, fontWeight: "700" as FontWeight },
  bodyLG: { fontSize: 16, lineHeight: 24, fontWeight: "500" as FontWeight },
  bodyMD: { fontSize: 14, lineHeight: 21, fontWeight: "500" as FontWeight },
  bodySM: { fontSize: 13, lineHeight: 20, fontWeight: "500" as FontWeight },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: "600" as FontWeight, letterSpacing: 0.5 },
  button: { fontSize: 15, lineHeight: 18, fontWeight: "700" as FontWeight },
} as const;

export function BoldText({
  variant = "bodyMD",
  weight,
  color,
  lineHeight,
  style,
  children,
  ...props
}: BoldTypographyProps) {
  const colors = useBoldColors();
  const baseStyle = TYPOGRAPHY[variant];
  const resolvedColor = color || colors.text;

  return (
    <Text
      style={[
        { fontFamily: "ArchivoBlack" },
        baseStyle,
        weight && { fontWeight: weight },
        lineHeight && { lineHeight },
        { color: resolvedColor },
        style,
      ] as TextStyle[]}
      {...props}
    >
      {children}
    </Text>
  );
}

export function BoldDisplayXL({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="displayXL" {...props}>{children}</BoldText>;
}

export function BoldDisplayLG({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="displayLG" {...props}>{children}</BoldText>;
}

export function BoldDisplayMD({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="displayMD" {...props}>{children}</BoldText>;
}

export function BoldHeading1({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="heading1" {...props}>{children}</BoldText>;
}

export function BoldHeading2({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="heading2" {...props}>{children}</BoldText>;
}

export function BoldHeading3({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="heading3" {...props}>{children}</BoldText>;
}

export function BoldBodyLG({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="bodyLG" {...props}>{children}</BoldText>;
}

export function BoldBodyMD({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="bodyMD" {...props}>{children}</BoldText>;
}

export function BoldBodySM({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="bodySM" {...props}>{children}</BoldText>;
}

export function BoldCaption({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="caption" {...props}>{children}</BoldText>;
}

export function BoldButtonText({ children, ...props }: Omit<BoldTypographyProps, "variant">) {
  return <BoldText variant="button" {...props}>{children}</BoldText>;
}