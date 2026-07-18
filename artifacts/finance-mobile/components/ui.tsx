/**
 * Aurora UI kit — shared building blocks for every screen.
 *
 * Everything reads theme tokens through useColors() so light/dark
 * both work automatically. Buttons fire haptics on native.
 */
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { Radius } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { shadow } from "@/utils/shadow";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

// ─── Haptics ──────────────────────────────────────────────────────────────────

export function haptic(kind: "light" | "medium" | "success" | "warning" | "error" = "light") {
  if (Platform.OS === "web") return;
  switch (kind) {
    case "light":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      break;
    case "medium":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      break;
    case "success":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      break;
    case "warning":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      break;
    case "error":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      break;
  }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  variant = "default",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "elevated" | "outline" | "tinted";
}) {
  const colors = useColors();
  const base: ViewStyle = {
    borderRadius: Radius.xl,
    padding: 20,
  };
  const variants: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elevated: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow({ opacity: 0.05, radius: 18, offsetY: 6, elevation: 3 }),
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    tinted: {
      backgroundColor: colors.cardElevated,
    },
  };
  return <View style={[base, variants[variant], style]}>{children}</View>;
}

// ─── GradientCard — hero surfaces ────────────────────────────────────────────

export function GradientCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { borderRadius: Radius.xl, padding: 24, overflow: "hidden" },
        shadow({ color: colors.gradientEnd, opacity: 0.35, radius: 20, offsetY: 10, elevation: 6 }),
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  style,
  small = false,
  hapticKind = "medium",
}: {
  label: string;
  onPress: () => void;
  icon?: FeatherName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  hapticKind?: Parameters<typeof haptic>[0];
}) {
  const colors = useColors();
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      onPress={() => {
        haptic(hapticKind);
        onPress();
      }}
      disabled={inactive}
      activeOpacity={0.85}
      style={style}
    >
      <LinearGradient
        colors={
          inactive
            ? [colors.border, colors.borderLight]
            : [colors.gradientStart, colors.gradientEnd]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.btnBase,
          small ? styles.btnSmall : styles.btnRegular,
          !inactive && shadow({ color: colors.gradientEnd, opacity: 0.3, radius: 12, offsetY: 6, elevation: 4 }),
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            {icon && <Feather name={icon} size={small ? 14 : 17} color="#fff" />}
            <Text style={[styles.btnText, small && styles.btnTextSmall]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function GhostButton({
  label,
  onPress,
  icon,
  style,
  small = false,
  tone = "neutral",
}: {
  label: string;
  onPress: () => void;
  icon?: FeatherName;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  tone?: "neutral" | "primary" | "danger";
}) {
  const colors = useColors();
  const fg =
    tone === "primary" ? colors.primary : tone === "danger" ? colors.danger : colors.textSecondary;
  return (
    <TouchableOpacity
      onPress={() => {
        haptic("light");
        onPress();
      }}
      activeOpacity={0.8}
      style={[
        styles.btnBase,
        small ? styles.btnSmall : styles.btnRegular,
        {
          backgroundColor: tone === "danger" ? colors.danger + "14" : colors.card,
          borderWidth: 1,
          borderColor: tone === "danger" ? colors.danger + "40" : colors.border,
        },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={small ? 14 : 17} color={fg} />}
      <Text style={[styles.btnText, small && styles.btnTextSmall, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── IconBadge ────────────────────────────────────────────────────────────────

export function IconBadge({
  icon,
  color,
  size = 44,
  emoji,
}: {
  icon?: FeatherName;
  color: string;
  size?: number;
  emoji?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        backgroundColor: color + "1C",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {emoji ? (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      ) : icon ? (
        <Feather name={icon} size={size * 0.44} color={color} />
      ) : null}
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={() => {
            haptic("light");
            onAction();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── ScreenHeader — page-level title block ───────────────────────────────────

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

export function Chip({
  label,
  color,
  icon,
  style,
  textStyle,
}: {
  label: string;
  color: string;
  icon?: FeatherName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: color + "18" }, style]}>
      {icon && <Feather name={icon} size={11} color={color} />}
      <Text style={[styles.chipText, { color }, textStyle]}>{label}</Text>
    </View>
  );
}

// ─── ProgressBar — animated fill ─────────────────────────────────────────────

export function ProgressBar({
  progress, // 0..1
  color,
  height = 8,
  trackColor,
  style,
}: {
  progress: number;
  color: string;
  height?: number;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: Math.max(0, Math.min(progress, 1)),
      tension: 35,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? colors.cardElevated,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={{ height: "100%", borderRadius: height / 2, backgroundColor: color, width }} />
    </View>
  );
}

// ─── Skeleton — pulsing placeholder ──────────────────────────────────────────

export function Skeleton({
  width,
  height = 16,
  radius = Radius.sm,
  style,
}: {
  width: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.cardElevated, opacity: pulse },
        style,
      ]}
    />
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: {
  icon?: FeatherName;
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }, style]}>
      <IconBadge icon={icon} emoji={emoji} color={colors.primary} size={56} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} small style={{ marginTop: 16 }} />
      ) : null}
    </View>
  );
}

// ─── FadeInView — subtle entrance animation ──────────────────────────────────

export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(translate, { toValue: 0, tension: 60, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: translate }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  btnBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.pill,
  },
  btnRegular: { paddingVertical: 16, paddingHorizontal: 24, minHeight: 54 },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 40 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  btnTextSmall: { fontSize: 13 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 19, fontFamily: "Outfit_700Bold", letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 13, fontFamily: "Outfit_400Regular", marginTop: 2 },
  sectionAction: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },

  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  screenTitle: { fontSize: 32, fontFamily: "Outfit_700Bold", letterSpacing: -0.8 },
  screenSubtitle: { fontSize: 15, fontFamily: "Outfit_400Regular", marginTop: 4 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    alignSelf: "flex-start",
  },
  chipText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },

  emptyState: {
    padding: 28,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontFamily: "Outfit_600SemiBold", marginTop: 14, marginBottom: 6 },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
});
