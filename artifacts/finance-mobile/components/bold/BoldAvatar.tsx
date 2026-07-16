import React from "react";
import { View, Text, Image, ViewStyle, TextStyle, StyleSheet, ImageStyle } from "react-native";
import { BoldText } from "./BoldTypography";
import { useBoldColors } from "@/constants/themes";

export type BoldAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface BoldAvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: BoldAvatarSize;
  status?: "online" | "offline" | "busy";
  style?: ViewStyle;
  icon?: React.ReactNode;
}

const SIZE_MAP: Record<BoldAvatarSize, { size: number; fontSize: number; statusSize: number }> = {
  xs: { size: 24, fontSize: 10, statusSize: 8 },
  sm: { size: 32, fontSize: 12, statusSize: 10 },
  md: { size: 40, fontSize: 14, statusSize: 12 },
  lg: { size: 56, fontSize: 18, statusSize: 14 },
  xl: { size: 80, fontSize: 28, statusSize: 18 },
};

export function BoldAvatar({ source, name, size = "md", status, style, icon }: BoldAvatarProps) {
  const colors = useBoldColors();
  const sizeConfig = SIZE_MAP[size];
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[{ position: "relative" }, style] as ViewStyle[]}>
      <View
        style={[
          styles.avatar,
          {
            width: sizeConfig.size,
            height: sizeConfig.size,
            borderRadius: sizeConfig.size / 2,
            backgroundColor: colors.primary + "30",
          },
        ] as ViewStyle[]}
      >
        {source ? (
          <Image
            source={source}
            style={[
              styles.image,
              { width: sizeConfig.size, height: sizeConfig.size, borderRadius: sizeConfig.size / 2 },
            ] as ImageStyle[]}
          />
        ) : icon ? (
          icon
        ) : (
          <BoldText
            variant="bodySM"
            style={[
              styles.initials,
              { fontSize: sizeConfig.fontSize, color: colors.primary },
            ] as TextStyle[]}
          >
            {initials || "?"}
          </BoldText>
        )}
      </View>
      {status && (
        <View
          style={[
            styles.status,
            {
              width: sizeConfig.statusSize,
              height: sizeConfig.statusSize,
              borderRadius: sizeConfig.statusSize / 2,
              borderColor: colors.background,
              backgroundColor:
                status === "online"
                  ? colors.success
                  : status === "busy"
                  ? colors.warning
                  : colors.muted,
            },
          ] as ViewStyle[]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    resizeMode: "cover",
  },
  initials: {
    textAlign: "center",
  },
  status: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});