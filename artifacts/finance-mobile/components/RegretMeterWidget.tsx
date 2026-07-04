import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetRegretScore } from "@workspace/api-client-react";
import type { RegretScore } from "@workspace/api-client-react";
import { useRouter } from "expo-router";

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
  const { data: score, isLoading, isError } = useGetRegretScore({
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const animatedScore = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (score) {
      Animated.spring(animatedScore, {
        toValue: score.score / 100,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }).start();

      if (score.level === "high") {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          ])
        ).start();
      }
    }
  }, [score?.score]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push("/(home)/(tabs)/insights" as any);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Analyzing your finances…
        </Text>
      </View>
    );
  }

  if (isError || !score) {
    return null;
  }

  const color = levelColor(score.level, colors);
  const arcWidth = animatedScore.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={{ transform: [{ scale: score.level === "high" ? pulseAnim : new Animated.Value(1) }] }}>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.card, borderColor: color + "30" }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Feather name={levelIcon(score.level)} size={18} color={color} />
            <Text style={[styles.title, { color: colors.text }]}>Regret Meter</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: color + "20" }]}>
            <Text style={[styles.levelText, { color }]}>{levelLabel(score.level)}</Text>
          </View>
        </View>

        {/* Score arc bar */}
        <View style={[styles.arcTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.arcFill,
              { backgroundColor: color, width: arcWidth },
            ]}
          />
        </View>

        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNum, { color }]}>{score.score}</Text>
          <Text style={[styles.scoreMax, { color: colors.mutedForeground }]}> / 100</Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.tapHint, { color: colors.primary }]}>
            View details →
          </Text>
        </View>

        <Text style={[styles.summary, { color: colors.mutedForeground }]} numberOfLines={2}>
          {score.summary}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  arcTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  arcFill: {
    height: "100%",
    borderRadius: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  scoreNum: {
    fontSize: 32,
    fontWeight: "800",
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: "500",
  },
  tapHint: {
    fontSize: 13,
    fontWeight: "600",
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
  },
});
