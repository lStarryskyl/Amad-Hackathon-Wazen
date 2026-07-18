import React, { useEffect, useRef } from "react";
import { shadow } from "@/utils/shadow";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetRegretScore } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { Radius } from "@/constants/colors";
import { Chip, IconBadge, haptic } from "@/components/ui";

function levelColor(level: string, colors: ReturnType<typeof useColors>) {
  if (level === "low") return colors.accent;
  if (level === "medium") return colors.warning;
  return colors.danger;
}

function levelLabel(level: string) {
  if (level === "low") return "Safe Zone";
  if (level === "medium") return "Caution";
  return "High Risk";
}

function levelIcon(level: string): "check-circle" | "alert-circle" | "alert-triangle" {
  if (level === "low") return "check-circle";
  if (level === "medium") return "alert-circle";
  return "alert-triangle";
}

interface Props {
  onPress?: () => void;
}

export default function RegretMeterWidget({ onPress }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { data: score, isError } = useGetRegretScore({
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const animatedScore = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (score && !score.noData) {
      Animated.spring(animatedScore, {
        toValue: (score.score ?? 0) / 100,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }).start();

      if (score.level === "high") {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          ])
        ).start();
      }
    }
  }, [score?.score]);

  const handlePress = () => {
    haptic("light");
    if (onPress) {
      onPress();
    } else {
      router.push("/(home)/(tabs)/insights" as any);
    }
  };

  if (isError || !score) {
    return null;
  }

  if (score.noData) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconBadge icon="bar-chart-2" color={colors.mutedForeground} size={36} />
            <Text style={[styles.title, { color: colors.text }]}>Regret Meter</Text>
          </View>
        </View>
        <Text style={[styles.summary, { color: colors.mutedForeground }]}>
          Add transactions to unlock your Regret Score.
        </Text>
      </TouchableOpacity>
    );
  }

  const s = score as Required<typeof score>;
  const color = levelColor(s.level, colors);
  const arcWidth = animatedScore.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={{ transform: [{ scale: s.level === "high" ? pulseAnim : new Animated.Value(1) }] }}>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.card, borderColor: color + "35" }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconBadge icon={levelIcon(s.level)} color={color} size={36} />
            <Text style={[styles.title, { color: colors.text }]}>Regret Meter</Text>
          </View>
          <Chip label={levelLabel(s.level)} color={color} />
        </View>

        {/* Score arc bar */}
        <View style={[styles.arcTrack, { backgroundColor: colors.cardElevated }]}>
          <Animated.View
            style={[
              styles.arcFill,
              { backgroundColor: color, width: arcWidth },
            ]}
          />
        </View>

        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNum, { color }]}>{s.score}</Text>
          <Text style={[styles.scoreMax, { color: colors.mutedForeground }]}> / 100</Text>
          <View style={{ flex: 1 }} />
          <View style={styles.tapHintRow}>
            <Text style={[styles.tapHint, { color: colors.primary }]}>Details</Text>
            <Feather name="arrow-right" size={13} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.summary, { color: colors.mutedForeground }]} numberOfLines={2}>
          {s.summary}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: 24,
    ...shadow({ opacity: 0.04, radius: 16, offsetY: 6, elevation: 2 }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontFamily: "Outfit_700Bold",
    letterSpacing: -0.2,
  },
  arcTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  arcFill: {
    height: "100%",
    borderRadius: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 10,
  },
  scoreNum: {
    fontSize: 42,
    fontFamily: "Lora_700Bold",
    letterSpacing: -1,
  },
  scoreMax: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  tapHintRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tapHint: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  summary: {
    fontSize: 13.5,
    fontFamily: "Outfit_400Regular",
    lineHeight: 20,
  },
});
