import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetRegretScore,
  useGenerateRescuePlan,
  useGetLatestRescuePlan,
  useGenerateMoneyStory,
  useGetLatestMoneyStory,
  useGetPatterns,
} from "@workspace/api-client-react";
import type { RegretFactor, RescueAction, BehavioralPattern } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function impactColor(impact: string, colors: ReturnType<typeof useColors>) {
  if (impact === "high") return colors.danger;
  if (impact === "medium") return colors.warning;
  return colors.accent;
}

// ─── Behavioral Patterns Section ─────────────────────────────────────────────

function BehavioralPatternsSection() {
  const colors = useColors();
  const { data, isLoading, refetch, isRefetching } = useGetPatterns({
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const severityColor = (severity: BehavioralPattern["severity"]) => {
    if (severity === "positive") return colors.accent;
    if (severity === "warning") return colors.warning;
    return colors.primary;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warning + "20" }]}>
            <Feather name="activity" size={20} color={colors.warning} />
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Behavioral Patterns</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Detected from your transaction history</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => refetch()}
          disabled={isRefetching}
          style={[styles.refreshBtn, { borderColor: colors.border }]}
        >
          {isRefetching
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Analyzing your spending patterns…</Text>
        </View>
      )}

      {!isLoading && (!data?.patterns || data.patterns.length === 0) && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Patterns Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Add more transactions to start seeing behavioral patterns.
          </Text>
        </View>
      )}

      {data?.patterns && data.patterns.length > 0 && (
        <View style={styles.patternsContainer}>
          {data.patterns.map((pattern) => (
            <PatternCard key={pattern.key} pattern={pattern} severityColor={severityColor} colors={colors} />
          ))}
        </View>
      )}
    </View>
  );
}

function PatternCard({
  pattern,
  severityColor,
  colors,
}: {
  pattern: BehavioralPattern;
  severityColor: (s: BehavioralPattern["severity"]) => string;
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = severityColor(pattern.severity);

  return (
    <TouchableOpacity
      style={[styles.patternCard, { backgroundColor: colors.cardElevated, borderLeftColor: color, borderLeftWidth: 3 }]}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.patternHeader}>
        <Text style={styles.patternEmoji}>{pattern.icon}</Text>
        <View style={styles.patternMiddle}>
          <Text style={[styles.patternTitle, { color: colors.text }]}>{pattern.title}</Text>
          {pattern.dataPoint && (
            <View style={[styles.dataPill, { backgroundColor: color + "20" }]}>
              <Text style={[styles.dataPillText, { color }]}>{pattern.dataPoint}</Text>
            </View>
          )}
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </View>
      {expanded && (
        <Text style={[styles.patternDesc, { color: colors.textSecondary }]}>{pattern.description}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Regret Meter Section ────────────────────────────────────────────────────

function RegretMeterSection() {
  const colors = useColors();
  const { data: score, isLoading, refetch, isRefetching } = useGetRegretScore({
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  const animScore = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (score) {
      Animated.spring(animScore, {
        toValue: score.score / 100,
        tension: 35,
        friction: 7,
        useNativeDriver: false,
      }).start();

      if (score.level === "high") {
        pulseRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ])
        );
        pulseRef.current.start();
      } else {
        pulseRef.current?.stop();
        pulseAnim.setValue(1);
      }
    }
    return () => { pulseRef.current?.stop(); };
  }, [score?.score, score?.level]);

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Computing your score…</Text>
      </View>
    );
  }

  if (!score) return null;

  const color = levelColor(score.level, colors);
  const arcWidth = animScore.interpolate({ inputRange: [0, 1], outputRange: ["2%", "100%"] });

  return (
    <Animated.View style={{ transform: [{ scale: score.level === "high" ? pulseAnim : new Animated.Value(1) }] }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: color + "25", borderWidth: 1 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
              <Feather
                name={score.level === "low" ? "check-circle" : score.level === "medium" ? "alert-circle" : "alert-triangle"}
                size={20}
                color={color}
              />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Regret Meter</Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Short-term financial regret risk</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => refetch()}
            disabled={isRefetching}
            style={[styles.refreshBtn, { borderColor: colors.border }]}
          >
            {isRefetching
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />}
          </TouchableOpacity>
        </View>

        <View style={styles.scoreDisplay}>
          <Text style={[styles.bigScore, { color }]}>{score.score}</Text>
          <View style={styles.scoreRight}>
            <View style={[styles.levelBadge, { backgroundColor: color + "20" }]}>
              <Text style={[styles.levelBadgeText, { color }]}>{levelLabel(score.level)}</Text>
            </View>
            <Text style={[styles.scoreOf, { color: colors.mutedForeground }]}>out of 100</Text>
          </View>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: color, width: arcWidth }]} />
          <View style={[styles.marker, { left: "30%", backgroundColor: colors.accent }]} />
          <View style={[styles.marker, { left: "60%", backgroundColor: colors.warning }]} />
        </View>
        <View style={styles.markerLabels}>
          <Text style={[styles.markerLabel, { color: colors.accent }]}>Safe</Text>
          <Text style={[styles.markerLabel, { color: colors.warning }]}>Caution</Text>
          <Text style={[styles.markerLabel, { color: colors.danger }]}>Risk</Text>
        </View>

        <View style={[styles.summaryBox, { backgroundColor: colors.cardElevated }]}>
          <Text style={[styles.summaryText, { color: colors.text }]}>{score.summary}</Text>
        </View>

        <Text style={[styles.factorsTitle, { color: colors.text }]}>Contributing Factors</Text>
        {score.factors.map((factor: RegretFactor) => (
          <FactorRow key={factor.key} factor={factor} colors={colors} />
        ))}

        <View style={styles.statsGrid}>
          <StatPill label="Savings Rate" value={`${score.savingsRate}%`} color={score.savingsRate >= 15 ? colors.accent : colors.warning} colors={colors} />
          <StatPill label="vs Prior Month" value={`${Math.round(score.spendingVelocityRatio * 100)}%`} color={score.spendingVelocityRatio <= 1.05 ? colors.accent : colors.danger} colors={colors} />
          <StatPill label="Fixed Costs" value={`${score.recurringBurdenPct}%`} color={score.recurringBurdenPct <= 40 ? colors.accent : colors.warning} colors={colors} />
        </View>
      </View>
    </Animated.View>
  );
}

function FactorRow({ factor, colors }: { factor: RegretFactor; colors: ReturnType<typeof useColors> }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = factor.impact === "positive" ? colors.accent : factor.impact === "negative" ? colors.danger : colors.warning;

  return (
    <TouchableOpacity
      style={[styles.factorRow, { borderBottomColor: colors.border }]}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.factorHeader}>
        <View style={[styles.factorDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.factorLabel, { color: colors.text }]}>{factor.label}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
      </View>
      {expanded && (
        <Text style={[styles.factorDesc, { color: colors.mutedForeground }]}>{factor.description}</Text>
      )}
    </TouchableOpacity>
  );
}

function StatPill({ label, value, color, colors }: { label: string; value: string; color: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.statPill, { backgroundColor: colors.cardElevated }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── Rescue Plan Section ─────────────────────────────────────────────────────

function RescuePlanSection() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: latest } = useGetLatestRescuePlan({ retry: 0 });
  const { mutate: generate, isPending, data: freshPlan } = useGenerateRescuePlan({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/rescue-plan/latest"] });
    },
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const plan = freshPlan ?? latest;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="shield" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Rescue Plan</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>AI-powered action recommendations</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          onPress={() => generate()}
          disabled={isPending}
        >
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.generateBtnText}>{plan ? "Refresh" : "Generate"}</Text>}
        </TouchableOpacity>
      </View>

      {!plan && !isPending && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <Feather name="zap" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Get Your Rescue Plan</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Tap "Generate" to get AI-powered recommendations based on your current financial signals.
          </Text>
        </View>
      )}

      {isPending && !plan && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Analyzing your finances and generating personalized actions…
          </Text>
        </View>
      )}

      {plan && (
        <>
          {plan.narrative && (
            <View style={[styles.narrativeBox, { backgroundColor: colors.cardElevated, borderLeftColor: colors.primary }]}>
              <Text style={[styles.narrativeText, { color: colors.textSecondary }]}>{plan.narrative}</Text>
            </View>
          )}

          <Text style={[styles.actionsTitle, { color: colors.text }]}>
            {plan.actions.length} Recommended Action{plan.actions.length !== 1 ? "s" : ""}
          </Text>

          {(plan.actions as RescueAction[]).map((action) => (
            <RescueActionCard
              key={action.id}
              action={action}
              colors={colors}
              isExpanded={expandedId === action.id}
              onToggle={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpandedId(expandedId === action.id ? null : action.id);
              }}
            />
          ))}

          <Text style={[styles.generatedAt, { color: colors.mutedForeground }]}>
            Generated {new Date(plan.generatedAt).toLocaleDateString()}
          </Text>
        </>
      )}
    </View>
  );
}

function RescueActionCard({
  action,
  colors,
  isExpanded,
  onToggle,
}: {
  action: RescueAction;
  colors: ReturnType<typeof useColors>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const impact = impactColor(action.impact, colors);
  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: colors.cardElevated, borderLeftColor: impact }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={styles.actionHeader}>
        <View style={styles.actionLeft}>
          <Text style={[styles.actionTag, { color: colors.mutedForeground }]}>{action.tag}</Text>
          <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
        </View>
        <View style={styles.actionRight}>
          {action.estimatedSaving != null && (
            <Text style={[styles.savingAmount, { color: colors.accent }]}>
              ~${action.estimatedSaving}/mo
            </Text>
          )}
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </View>
      </View>

      {isExpanded && (
        <View style={styles.actionBody}>
          <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{action.description}</Text>
          <View style={[styles.impactChip, { backgroundColor: impact + "20" }]}>
            <Text style={[styles.impactText, { color: impact }]}>{action.impact.toUpperCase()} IMPACT</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Money Stories Section ───────────────────────────────────────────────────

function MoneyStoriesSection() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: latest } = useGetLatestMoneyStory({ retry: 0 });
  const { mutate: generate, isPending, data: freshStory } = useGenerateMoneyStory({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/money-story/latest"] });
    },
  });

  const story = freshStory ?? latest;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + "20" }]}>
            <Feather name="book-open" size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Money Stories</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Your financial life, narrated</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.accent }]}
          onPress={() => generate()}
          disabled={isPending}
        >
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.generateBtnText}>{story ? "Refresh" : "Generate"}</Text>}
        </TouchableOpacity>
      </View>

      {!story && !isPending && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <Feather name="book" size={32} color={colors.accent} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your Financial Story</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Turn your last 3 months of transactions into an insightful, personalized narrative. Tap "Generate" to begin.
          </Text>
        </View>
      )}

      {isPending && !story && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <ActivityIndicator color={colors.accent} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Reading your transaction history and crafting your story…
          </Text>
        </View>
      )}

      {story && (story as any).noData && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <Feather name="book" size={32} color={colors.accent} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transactions Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            {story.narrative}
          </Text>
        </View>
      )}

      {story && !(story as any).noData && (
        <View>
          <View style={[styles.storyPeriod, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30" }]}>
            <Feather name="calendar" size={14} color={colors.accent} />
            <Text style={[styles.storyPeriodText, { color: colors.accent }]}>{story.periodLabel}</Text>
          </View>
          <Text style={[styles.storyNarrative, { color: colors.textSecondary }]}>
            {story.narrative}
          </Text>
          <Text style={[styles.generatedAt, { color: colors.mutedForeground }]}>
            Story generated {new Date(story.generatedAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: 120,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Insights</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
          AI-powered financial intelligence
        </Text>
      </View>

      <BehavioralPatternsSection />
      <RegretMeterSection />
      <RescuePlanSection />
      <MoneyStoriesSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: "800" },
  pageSubtitle: { fontSize: 14, marginTop: 4 },

  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  generateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
  },
  generateBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  loadingText: { textAlign: "center", marginTop: 8, fontSize: 13 },

  patternsContainer: { gap: 10 },
  patternCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 0,
  },
  patternHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  patternEmoji: { fontSize: 24 },
  patternMiddle: { flex: 1 },
  patternTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  dataPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  dataPillText: { fontSize: 11, fontWeight: "700" },
  patternDesc: { fontSize: 13, lineHeight: 19, marginTop: 10, paddingLeft: 34 },

  scoreDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  bigScore: { fontSize: 64, fontWeight: "800", lineHeight: 70 },
  scoreRight: { gap: 6 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  levelBadgeText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  scoreOf: { fontSize: 12 },

  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "visible",
    marginBottom: 4,
    position: "relative",
  },
  progressFill: { height: "100%", borderRadius: 5 },
  marker: { position: "absolute", top: -2, width: 2, height: 14, borderRadius: 1 },
  markerLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  markerLabel: { fontSize: 10, fontWeight: "600" },

  summaryBox: { padding: 14, borderRadius: 16, marginBottom: 16 },
  summaryText: { fontSize: 14, lineHeight: 20 },

  factorsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  factorRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  factorHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  factorDot: { width: 8, height: 8, borderRadius: 4 },
  factorLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  factorDesc: { fontSize: 13, lineHeight: 18, marginTop: 6, paddingLeft: 16 },

  statsGrid: { flexDirection: "row", gap: 8, marginTop: 16 },
  statPill: { flex: 1, padding: 12, borderRadius: 16, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 10, marginTop: 2, textAlign: "center" },

  narrativeBox: {
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 3,
    marginBottom: 16,
  },
  narrativeText: { fontSize: 14, lineHeight: 21, fontStyle: "italic" },

  actionsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  actionCard: {
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  actionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  actionLeft: { flex: 1, marginRight: 8 },
  actionTag: { fontSize: 11, marginBottom: 2 },
  actionTitle: { fontSize: 15, fontWeight: "700" },
  actionRight: { alignItems: "flex-end", gap: 4 },
  savingAmount: { fontSize: 12, fontWeight: "700" },
  actionBody: { marginTop: 10 },
  actionDesc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  impactChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  impactText: { fontSize: 10, fontWeight: "700" },

  storyPeriod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  storyPeriodText: { fontSize: 12, fontWeight: "600" },
  storyNarrative: { fontSize: 15, lineHeight: 24 },

  emptyState: { padding: 24, borderRadius: 20, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: "center" },

  generatedAt: { fontSize: 11, marginTop: 14, textAlign: "right" },
});
