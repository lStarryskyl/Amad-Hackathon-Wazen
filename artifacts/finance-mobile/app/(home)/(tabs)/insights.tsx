import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetRegretScore,
  useGetRescuePlan,
  useGetMoneyStory,
  useGenerateMoneyStory,
} from "@workspace/api-client-react";
import type { RescueAction } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { toFeatherIcon } from "@/utils/iconMapping";

// ─── Regret Meter ────────────────────────────────────────────────────────────

function RegretMeter({ score, level }: { score: number; level: string }) {
  const colors = useColors();
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score]);

  const meterColor =
    level === "low" ? colors.accent : level === "medium" ? "#F59E0B" : colors.danger;

  const bgColor =
    level === "low"
      ? colors.accent + "15"
      : level === "medium"
      ? "#F59E0B15"
      : colors.danger + "15";

  const label =
    level === "low" ? "Safe Zone" : level === "medium" ? "Caution" : "High Risk";

  const emoji = level === "low" ? "🟢" : level === "medium" ? "🟡" : "🔴";

  const RADIUS = 90;
  const STROKE = 12;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const dashOffset = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.meterContainer, { backgroundColor: bgColor, borderColor: meterColor + "40" }]}>
      <View style={styles.meterHeader}>
        <Text style={[styles.meterTitle, { color: colors.text }]}>Regret Meter</Text>
        <View style={[styles.levelBadge, { backgroundColor: meterColor + "20" }]}>
          <Text style={[styles.levelText, { color: meterColor }]}>{emoji} {label}</Text>
        </View>
      </View>

      {/* Gauge visualization using bar */}
      <View style={styles.gaugeRow}>
        <View style={styles.gaugeWrap}>
          <View style={[styles.gaugeBg, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.gaugeFill,
                {
                  backgroundColor: meterColor,
                  width: animVal.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={[styles.gaugeLabel, { color: colors.accent }]}>Safe</Text>
            <Text style={[styles.gaugeLabel, { color: "#F59E0B" }]}>Caution</Text>
            <Text style={[styles.gaugeLabel, { color: colors.danger }]}>Risk</Text>
          </View>
        </View>
        <View style={styles.scoreBox}>
          <Text style={[styles.scoreNumber, { color: meterColor }]}>{score}</Text>
          <Text style={[styles.scoreOf, { color: colors.mutedForeground }]}>/100</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Factor Card ─────────────────────────────────────────────────────────────

function FactorCard({ factor, meterColor }: { factor: any; meterColor: string }) {
  const colors = useColors();
  return (
    <View style={[styles.factorCard, { backgroundColor: colors.card }]}>
      <View style={[styles.factorImpact, { backgroundColor: meterColor + "20" }]}>
        <Text style={[styles.factorImpactText, { color: meterColor }]}>+{factor.impact}</Text>
      </View>
      <View style={styles.factorContent}>
        <Text style={[styles.factorLabel, { color: colors.text }]}>{factor.label}</Text>
        <Text style={[styles.factorDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {factor.description}
        </Text>
      </View>
    </View>
  );
}

// ─── Rescue Action Card ───────────────────────────────────────────────────────

function RescueCard({ action }: { action: RescueAction }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const difficultyColor =
    action.difficulty === "easy" ? colors.accent : action.difficulty === "medium" ? "#F59E0B" : colors.danger;

  return (
    <TouchableOpacity
      style={[styles.rescueCard, { backgroundColor: colors.card }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
    >
      <View style={styles.rescueHeader}>
        <View style={[styles.rescueIcon, { backgroundColor: colors.primary + "20" }]}>
          <Feather name={toFeatherIcon(action.icon)} size={20} color={colors.primary} />
        </View>
        <View style={styles.rescueTitleWrap}>
          <Text style={[styles.rescueTitle, { color: colors.text }]}>{action.title}</Text>
          <View style={styles.rescueMeta}>
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + "20" }]}>
              <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                {action.difficulty}
              </Text>
            </View>
            {action.estimatedSaving > 0 && (
              <Text style={[styles.savingText, { color: colors.accent }]}>
                ~${action.estimatedSaving}/mo
              </Text>
            )}
          </View>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </View>
      {expanded && (
        <Text style={[styles.rescueDesc, { color: colors.textSecondary }]}>{action.description}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: regretScore,
    isLoading: scoreLoading,
    refetch: refetchScore,
    error: scoreError,
  } = useGetRegretScore();

  const {
    data: rescuePlan,
    isLoading: rescueLoading,
    refetch: refetchRescue,
    error: rescueError,
  } = useGetRescuePlan();

  const {
    data: moneyStory,
    isLoading: storyLoading,
    refetch: refetchStory,
  } = useGetMoneyStory();

  const { mutate: generateStory, isPending: generating } = useGenerateMoneyStory();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchScore(), refetchRescue(), refetchStory()]);
    setRefreshing(false);
  };

  const handleGenerateStory = () => {
    generateStory(undefined, { onSuccess: () => refetchStory() });
  };

  const meterColor =
    regretScore?.level === "low"
      ? colors.accent
      : regretScore?.level === "medium"
      ? "#F59E0B"
      : colors.danger;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Financial Insights</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
          AI-powered analysis of your money patterns
        </Text>
      </View>

      {/* ── Regret Meter Section ── */}
      <View style={styles.section}>
        {scoreLoading ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Analysing your spending…
            </Text>
          </View>
        ) : scoreError ? (
          <View style={[styles.errorCard, { backgroundColor: colors.card }]}>
            <Feather name="alert-circle" size={24} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Could not load score. Pull to refresh.
            </Text>
          </View>
        ) : regretScore ? (
          <>
            <RegretMeter score={regretScore.score} level={regretScore.level} />

            {regretScore.factors.length > 0 && (
              <View style={styles.factorsSection}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Contributing Factors</Text>
                {regretScore.factors.map((f) => (
                  <FactorCard key={f.key} factor={f} meterColor={meterColor} />
                ))}
              </View>
            )}

            {regretScore.factors.length === 0 && (
              <View style={[styles.safeCard, { backgroundColor: colors.accent + "10", borderColor: colors.accent + "30" }]}>
                <Feather name="check-circle" size={24} color={colors.accent} />
                <Text style={[styles.safeText, { color: colors.text }]}>
                  No risk factors detected. You're on track!
                </Text>
              </View>
            )}
          </>
        ) : null}
      </View>

      {/* ── Rescue Plan Section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rescue Plan</Text>
          <View style={[styles.aiChip, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="zap" size={12} color={colors.primary} />
            <Text style={[styles.aiChipText, { color: colors.primary }]}>AI + Deterministic</Text>
          </View>
        </View>

        {rescueLoading ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Building your rescue plan…
            </Text>
          </View>
        ) : rescueError ? (
          <View style={[styles.errorCard, { backgroundColor: colors.card }]}>
            <Feather name="alert-circle" size={24} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Could not load rescue plan.
            </Text>
          </View>
        ) : rescuePlan ? (
          <>
            {rescuePlan.narrative && (
              <View style={[styles.narrativeCard, { backgroundColor: colors.card }]}>
                <Feather name="message-circle" size={18} color={colors.primary} style={{ marginBottom: 8 }} />
                <Text style={[styles.narrativeText, { color: colors.textSecondary }]}>
                  {rescuePlan.narrative}
                </Text>
              </View>
            )}
            {rescuePlan.actions.map((action, i) => (
              <RescueCard key={i} action={action} />
            ))}
          </>
        ) : null}
      </View>

      {/* ── Money Stories Section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Money Story</Text>
          <View style={[styles.aiChip, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="cpu" size={12} color={colors.primary} />
            <Text style={[styles.aiChipText, { color: colors.primary }]}>AI Narrative</Text>
          </View>
        </View>

        {storyLoading ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : moneyStory ? (
          <View style={[styles.storyCard, { backgroundColor: colors.card }]}>
            <View style={styles.storyHeader}>
              <View style={[styles.storyPeriodBadge, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="calendar" size={14} color={colors.primary} />
                <Text style={[styles.storyPeriod, { color: colors.primary }]}>
                  {moneyStory.periodLabel}
                </Text>
              </View>
            </View>
            <Text style={[styles.storyText, { color: colors.textSecondary }]}>
              {moneyStory.narrative}
            </Text>
            <TouchableOpacity
              style={[styles.refreshStoryButton, { borderColor: colors.border }]}
              onPress={handleGenerateStory}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Feather name="refresh-cw" size={14} color={colors.primary} />
                  <Text style={[styles.refreshStoryText, { color: colors.primary }]}>Regenerate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.generateCard, { backgroundColor: colors.card }]}>
            <View style={[styles.generateIconRing, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="book-open" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.generateTitle, { color: colors.text }]}>
              Get Your Money Story
            </Text>
            <Text style={[styles.generateDesc, { color: colors.mutedForeground }]}>
              AI turns your transaction history into a personalized financial narrative — what happened, what it means, and what to do next.
            </Text>
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: colors.primary }]}
              onPress={handleGenerateStory}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="zap" size={16} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Generate My Story</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 24, marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, fontWeight: "400" },
  section: { marginBottom: 32, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionLabel: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiChipText: { fontSize: 11, fontWeight: "600" },
  loadingCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  errorCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 8,
  },
  errorText: { fontSize: 14, textAlign: "center" },
  // Regret Meter
  meterContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  meterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  meterTitle: { fontSize: 18, fontWeight: "700" },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: { fontSize: 13, fontWeight: "700" },
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  gaugeWrap: { flex: 1 },
  gaugeBg: {
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    marginBottom: 6,
  },
  gaugeFill: { height: "100%", borderRadius: 7 },
  gaugeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gaugeLabel: { fontSize: 11, fontWeight: "600" },
  scoreBox: { alignItems: "center" },
  scoreNumber: { fontSize: 36, fontWeight: "800", lineHeight: 40 },
  scoreOf: { fontSize: 12, fontWeight: "500" },
  // Factors
  factorsSection: { marginTop: 4 },
  factorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  factorImpact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  factorImpactText: { fontSize: 12, fontWeight: "700" },
  factorContent: { flex: 1 },
  factorLabel: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  factorDesc: { fontSize: 12, lineHeight: 18 },
  safeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  safeText: { fontSize: 14, fontWeight: "500", flex: 1 },
  // Rescue Plan
  narrativeCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  narrativeText: { fontSize: 14, lineHeight: 22 },
  rescueCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  rescueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rescueIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  rescueTitleWrap: { flex: 1 },
  rescueTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  rescueMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  savingText: { fontSize: 12, fontWeight: "600" },
  rescueDesc: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  // Money Story
  storyCard: {
    padding: 20,
    borderRadius: 20,
  },
  storyHeader: { marginBottom: 16 },
  storyPeriodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  storyPeriod: { fontSize: 13, fontWeight: "600" },
  storyText: { fontSize: 15, lineHeight: 26, marginBottom: 16 },
  refreshStoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  refreshStoryText: { fontSize: 13, fontWeight: "600" },
  generateCard: {
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
  },
  generateIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  generateTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  generateDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 280,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  generateButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
