import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useGetRegretScore } from "@workspace/api-client-react";
import type { RegretScore } from "@workspace/api-client-react";
import { useRouter } from "expo-router";

import {
  BoldCard,
  BoldText,
  BoldBadge,
  BoldProgress,
  BoldButton,
  BoldAvatar,
} from "@/components/bold";
import { useBoldColors } from "@/hooks/useBoldColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function levelColor(level: string, colors: ReturnType<typeof useBoldColors>) {
  if (level === "low") return colors.success;
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
  const colors = useBoldColors();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const { data: score, isLoading, isError } = useGetRegretScore({
    staleTime: 5 * 60 * 1000,
    retry: 1,
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

      if (score.level === "high" && !reducedMotion) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          ])
        ).start();
      }
    }
  }, [score?.score, reducedMotion]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push("/(home)/(tabs)/insights" as any);
    }
  };

  if (isLoading) {
    return (
      <BoldCard variant="elevated" padding="lg" style={styles.container}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <BoldText variant="bodySM" color={colors.mutedForeground} style={styles.loadingText}>
            Analyzing your finances…
          </BoldText>
        </View>
      </BoldCard>
    );
  }

  if (isError || !score) {
    return null;
  }

  if (score.noData) {
    return (
      <BoldCard variant="outlined" padding="lg" style={styles.container} onPress={handlePress}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <BoldAvatar size="sm" name="RS" status="offline" icon={<Feather name="bar-chart-2" size={18} color={colors.mutedForeground} />} />
            <BoldText variant="bodyLG" weight="700" color={colors.text}>Regret Score</BoldText>
          </View>
        </View>
        <BoldText variant="bodySM" color={colors.mutedForeground}>
          Add transactions to unlock your Regret Score.
        </BoldText>
      </BoldCard>
    );
  }

  const s = score as Required<typeof score>;
  const color = levelColor(s.level, colors);
  const arcWidth = animatedScore.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={{ transform: [{ scale: s.level === "high" && !reducedMotion ? pulseAnim : 1 }] }}>
      <BoldCard variant="outlined" padding="lg" style={[styles.container, { borderColor: color + "30" }]} onPress={handlePress}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <BoldAvatar size="sm" name="RS" status={s.level === "low" ? "online" : s.level === "medium" ? "busy" : "offline"} icon={<Feather name={levelIcon(s.level)} size={18} color={color} />} />
            <BoldText variant="bodyLG" weight="700" color={colors.text}>Regret Score</BoldText>
          </View>
          <BoldBadge variant={s.level === "low" ? "success" : s.level === "medium" ? "warning" : "danger"} size="md">
            <BoldText variant="caption" weight="700" color={color} style={{ textTransform: "uppercase" }}>
              {levelLabel(s.level)}
            </BoldText>
          </BoldBadge>
        </View>

        {/* Score arc bar */}
        <BoldProgress value={s.score} max={100} variant={s.level === "low" ? "success" : s.level === "medium" ? "warning" : "danger"} size="md" animated={!reducedMotion} style={styles.arcTrack} />

        <View style={styles.scoreRow}>
          <BoldText variant="heading2" weight="800" color={color} style={styles.scoreNum}>{s.score}</BoldText>
          <BoldText variant="bodySM" color={colors.mutedForeground} style={styles.scoreMax}> / 100</BoldText>
          <View style={{ flex: 1 }} />
          <BoldText variant="bodySM" weight="600" color={colors.primary} style={styles.tapHint}>
            View details →
          </BoldText>
        </View>

        <BoldText variant="bodySM" color={colors.mutedForeground} numberOfLines={2} style={styles.summary}>
          {s.summary}
        </BoldText>
      </BoldCard>
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 0,
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
  arcTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  scoreNum: {},
  scoreMax: {},
  tapHint: {},
  summary: {
    lineHeight: 18,
  },
});