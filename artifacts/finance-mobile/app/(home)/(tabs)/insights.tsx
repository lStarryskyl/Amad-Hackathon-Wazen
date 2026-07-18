import React, { useState, useRef, useEffect } from "react";
import { shadow } from "@/utils/shadow";
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
  RefreshControl,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Polyline, Circle } from "react-native-svg";
import {
  useGetRegretScore,
  useGetRegretScoreHistory,
  useGenerateRescuePlan,
  useGetLatestRescuePlan,
  useGenerateMoneyStory,
  useGetLatestMoneyStory,
  useGetPatterns,
  useGetTransactionCount,
} from "@workspace/api-client-react";
import type { RegretFactor, RescueAction, BehavioralPattern } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { Radius } from "@/constants/colors";
import { ScreenHeader, haptic } from "@/components/ui";

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
  const { data, isLoading, isError: patternsError, refetch, isRefetching } = useGetPatterns({
    staleTime: 5 * 60 * 1000,
    retry: 0,
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

      {isLoading && !patternsError && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Analyzing your spending patterns…</Text>
        </View>
      )}

      {(!isLoading || patternsError) && (!data?.patterns || data.patterns.length === 0) && (
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

// ─── Regret score trend sparkline ────────────────────────────────────────────

function RegretTrend({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { data: history } = useGetRegretScoreHistory({ staleTime: 5 * 60 * 1000, retry: 0 });
  const [width, setWidth] = useState(0);

  if (!history || history.length < 2) return null;

  // History arrives newest-first; chart oldest → newest
  const points = [...history].reverse();
  const H = 56;
  const PAD = 6;

  const scores = points.map((p) => p.score);
  const minV = Math.min(...scores);
  const maxV = Math.max(...scores);
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (width - PAD * 2);
  const toY = (v: number) => PAD + ((maxV - v) / range) * (H - PAD * 2);

  const pts = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.score).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const improving = last.score <= first.score; // lower regret is better
  const lineColor = improving ? colors.accent : colors.warning;

  return (
    <View style={{ marginTop: 20 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }}>
          Score Trend
        </Text>
        <Text style={{ fontSize: 12, fontFamily: "Outfit_600SemiBold", color: lineColor }}>
          {improving ? "▼ Improving" : "▲ Rising"} · last {points.length} checks
        </Text>
      </View>
      {width > 10 && (
        <Svg width={width} height={H}>
          <Polyline points={pts} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={toX(points.length - 1)} cy={toY(last.score)} r={4} fill={lineColor} />
        </Svg>
      )}
    </View>
  );
}

// ─── Regret Meter Section ────────────────────────────────────────────────────

function RegretMeterSection() {
  const colors = useColors();
  const { data: score, isLoading, isError: scoreError, refetch, isRefetching } = useGetRegretScore({
    staleTime: 3 * 60 * 1000,
    retry: 0,
  });

  const animScore = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (score && !score.noData) {
      Animated.spring(animScore, {
        toValue: (score.score ?? 0) / 100,
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

  if ((isLoading && !scoreError) ) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Computing your score…</Text>
      </View>
    );
  }

  if (scoreError || !score) return null;

  if (score.noData) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: colors.mutedForeground + "20" }]}>
              <Feather name="bar-chart-2" size={20} color={colors.mutedForeground} />
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
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <Feather name="inbox" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Data Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Your Regret Meter will appear once you've added at least one month of transactions. Add some transactions to get started.
          </Text>
        </View>
      </View>
    );
  }

  const s = score as Required<typeof score>;
  const color = levelColor(s.level, colors);
  const arcWidth = animScore.interpolate({ inputRange: [0, 1], outputRange: ["2%", "100%"] });

  return (
    <Animated.View style={{ transform: [{ scale: s.level === "high" ? pulseAnim : new Animated.Value(1) }] }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: color + "25", borderWidth: 1 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
              <Feather
                name={s.level === "low" ? "check-circle" : s.level === "medium" ? "alert-circle" : "alert-triangle"}
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
          <Text style={[styles.bigScore, { color }]}>{s.score}</Text>
          <View style={styles.scoreRight}>
            <View style={[styles.levelBadge, { backgroundColor: color + "20" }]}>
              <Text style={[styles.levelBadgeText, { color }]}>{levelLabel(s.level)}</Text>
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
          <Text style={[styles.summaryText, { color: colors.text }]}>{s.summary}</Text>
        </View>

        <Text style={[styles.factorsTitle, { color: colors.text }]}>Contributing Factors</Text>
        {s.factors.map((factor: RegretFactor) => (
          <FactorRow key={factor.key} factor={factor} colors={colors} />
        ))}

        <View style={styles.statsGrid}>
          <StatPill label="Savings Rate" value={`${s.savingsRate}%`} color={s.savingsRate >= 15 ? colors.accent : colors.warning} colors={colors} />
          <StatPill label="vs Prior Month" value={`${Math.round(s.spendingVelocityRatio * 100)}%`} color={s.spendingVelocityRatio <= 1.05 ? colors.accent : colors.danger} colors={colors} />
          <StatPill label="Fixed Costs" value={`${s.recurringBurdenPct}%`} color={s.recurringBurdenPct <= 40 ? colors.accent : colors.warning} colors={colors} />
        </View>

        <RegretTrend colors={colors} />
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
          onPress={() => { haptic("medium"); generate(); }}
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
              {plan.aiUnavailable && (
                <View style={[styles.aiUnavailableBadge, { backgroundColor: colors.border }]}>
                  <Feather name="cpu" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.aiUnavailableText, { color: colors.mutedForeground }]}>AI-generated content unavailable</Text>
                </View>
              )}
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
  const router = useRouter();
  const { data: latest } = useGetLatestMoneyStory({ retry: 0 });
  const { mutate: generate, isPending, data: freshStory } = useGenerateMoneyStory({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/money-story/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/count"] });
    },
  });
  const { data: txCountData, isLoading: isCountLoading } = useGetTransactionCount({
    staleTime: 30 * 1000,
    retry: 1,
  });

  const story = freshStory ?? latest;
  const hasNoTransactions = !isCountLoading && txCountData !== undefined && txCountData.count === 0;

  const noDataContent = (
    <View style={[styles.noDataState, { backgroundColor: colors.cardElevated }]}>
      <View style={[styles.noDataIconRow]}>
        <View style={[styles.noDataIconBubble, { backgroundColor: colors.accent + "18" }]}>
          <Feather name="book-open" size={36} color={colors.accent} />
        </View>
      </View>
      <Text style={[styles.noDataTitle, { color: colors.text }]}>Your Story Hasn't Started Yet</Text>
      <Text style={[styles.noDataDesc, { color: colors.mutedForeground }]}>
        Money Stories turns your spending and saving into a personalized financial narrative. Add at least one transaction to get started.
      </Text>
      <View style={[styles.noDataSteps, { borderColor: colors.border }]}>
        <View style={styles.noDataStep}>
          <View style={[styles.noDataStepNum, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.noDataStepNumText, { color: colors.primary }]}>1</Text>
          </View>
          <Text style={[styles.noDataStepText, { color: colors.textSecondary }]}>Add your first transaction on the Home tab</Text>
        </View>
        <View style={styles.noDataStep}>
          <View style={[styles.noDataStepNum, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.noDataStepNumText, { color: colors.primary }]}>2</Text>
          </View>
          <Text style={[styles.noDataStepText, { color: colors.textSecondary }]}>Keep logging for a month to build context</Text>
        </View>
        <View style={styles.noDataStep}>
          <View style={[styles.noDataStepNum, { backgroundColor: colors.accent + "20" }]}>
            <Text style={[styles.noDataStepNumText, { color: colors.accent }]}>3</Text>
          </View>
          <Text style={[styles.noDataStepText, { color: colors.textSecondary }]}>Generate your personalized financial narrative</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.noDataCTA, { backgroundColor: colors.primary }]}
        onPress={() => router.navigate("/")}
        activeOpacity={0.85}
      >
        <Feather name="plus-circle" size={18} color="#fff" />
        <Text style={styles.noDataCTAText}>Add Your First Transaction</Text>
      </TouchableOpacity>
    </View>
  );

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
        {!hasNoTransactions && (
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.accent }]}
            onPress={() => { haptic("medium"); generate(); }}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.generateBtnText}>{story ? "Refresh" : "Generate"}</Text>}
          </TouchableOpacity>
        )}
      </View>

      {hasNoTransactions && noDataContent}

      {!hasNoTransactions && !story && !isPending && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <Feather name="book" size={32} color={colors.accent} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your Financial Story</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Turn your last 3 months of transactions into an insightful, personalized narrative. Tap "Generate" to begin.
          </Text>
        </View>
      )}

      {!hasNoTransactions && isPending && !story && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardElevated }]}>
          <ActivityIndicator color={colors.accent} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Reading your transaction history and crafting your story…
          </Text>
        </View>
      )}

      {!hasNoTransactions && story && (story as any).noData && noDataContent}

      {!hasNoTransactions && story && !(story as any).noData && (
        <View>
          <View style={[styles.storyPeriod, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30" }]}>
            <Feather name="calendar" size={14} color={colors.accent} />
            <Text style={[styles.storyPeriodText, { color: colors.accent }]}>{story.periodLabel}</Text>
          </View>
          <Text style={[styles.storyNarrative, { color: colors.textSecondary }]}>
            {story.narrative}
          </Text>
          {story.aiUnavailable && (
            <View style={[styles.aiUnavailableBadge, { backgroundColor: colors.border }]}>
              <Feather name="cpu" size={11} color={colors.mutedForeground} />
              <Text style={[styles.aiUnavailableText, { color: colors.mutedForeground }]}>AI-generated content unavailable</Text>
            </View>
          )}
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
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/ai/regret-score"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/ai/regret-score/history"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/patterns"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/ai/rescue-plan/latest"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/ai/money-story/latest"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: 120,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <ScreenHeader title="Insights" subtitle="AI-powered financial intelligence" />

      <BehavioralPatternsSection />
      <RegretMeterSection />
      <RescuePlanSection />
      <MoneyStoriesSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  card: {
    borderRadius: Radius.xl,
    padding: 20,
    marginBottom: 20,
    ...shadow({ opacity: 0.05, radius: 18, offsetY: 6, elevation: 3 }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontFamily: "Outfit_700Bold", letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 12.5, fontFamily: "Outfit_400Regular", marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  generateBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    minWidth: 88,
    alignItems: "center",
  },
  generateBtnText: { color: "#fff", fontSize: 14, fontFamily: "Outfit_600SemiBold" },

  loadingText: { textAlign: "center", marginTop: 12, fontSize: 14, fontFamily: "Outfit_500Medium" },

  patternsContainer: { gap: 12 },
  patternCard: {
    padding: 16,
    borderRadius: Radius.md,
    marginBottom: 0,
  },
  patternHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  patternEmoji: { fontSize: 28 },
  patternMiddle: { flex: 1 },
  patternTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold", marginBottom: 6 },
  dataPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start" },
  dataPillText: { fontSize: 12, fontFamily: "Outfit_700Bold" },
  patternDesc: { fontSize: 14, lineHeight: 22, fontFamily: "Outfit_400Regular", marginTop: 12, paddingLeft: 40 },

  scoreDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 16,
  },
  bigScore: { fontSize: 60, fontFamily: "Lora_700Bold", letterSpacing: -2 },
  scoreRight: { justifyContent: "center" },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, alignSelf: "flex-start", marginBottom: 4 },
  levelBadgeText: { fontSize: 12, fontFamily: "Outfit_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  scoreOf: { fontSize: 14, fontFamily: "Outfit_500Medium" },

  progressTrack: { height: 10, borderRadius: 5, overflow: "hidden", position: "relative", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 5 },
  marker: { position: "absolute", top: 0, bottom: 0, width: 3, borderRadius: 1.5 },
  markerLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, paddingHorizontal: 2 },
  markerLabel: { fontSize: 11, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase" },

  summaryBox: { padding: 16, borderRadius: Radius.md, marginBottom: 24 },
  summaryText: { fontSize: 15, fontFamily: "Outfit_400Regular", lineHeight: 22 },

  factorsTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold", marginBottom: 12 },
  factorRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  factorHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  factorDot: { width: 10, height: 10, borderRadius: 5 },
  factorLabel: { flex: 1, fontSize: 15, fontFamily: "Outfit_500Medium" },
  factorDesc: { marginTop: 8, marginLeft: 22, fontSize: 14, lineHeight: 20, fontFamily: "Outfit_400Regular" },

  statsGrid: { flexDirection: "row", gap: 12, marginTop: 24 },
  statPill: { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  statLabel: { fontSize: 11, fontFamily: "Outfit_500Medium", textAlign: "center", textTransform: "uppercase" },

  emptyState: { padding: 32, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold", marginBottom: 8 },
  emptyDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 22 },

  actionsTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold", marginBottom: 16 },
  actionCard: { padding: 16, borderRadius: Radius.md, marginBottom: 12, borderLeftWidth: 4 },
  actionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  actionLeft: { flex: 1, paddingRight: 16 },
  actionTag: { fontSize: 11, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 },
  actionTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold", lineHeight: 22 },
  actionRight: { alignItems: "flex-end", gap: 8 },
  savingAmount: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  actionBody: { marginTop: 16 },
  actionDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", lineHeight: 22, marginBottom: 12 },
  impactChip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  impactText: { fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 0.5 },

  narrativeBox: { padding: 20, borderRadius: Radius.md, marginBottom: 24, borderLeftWidth: 4 },
  narrativeText: { fontSize: 15, fontFamily: "Outfit_400Regular", lineHeight: 24 },
  aiUnavailableBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start", borderWidth: 1 },
  aiUnavailableText: { fontSize: 11, fontFamily: "Outfit_500Medium" },

  generatedAt: { fontSize: 12, fontFamily: "Outfit_400Regular", textAlign: "center", marginTop: 24 },

  storyPeriod: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  storyPeriodText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  storyNarrative: { fontSize: 16, fontFamily: "Lora_400Regular", lineHeight: 28 },

  noDataState: { padding: 32, borderRadius: 24, alignItems: "center" },
  noDataIconRow: { flexDirection: "row", justifyContent: "center", marginBottom: 24 },
  noDataIconBubble: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  noDataTitle: { fontSize: 20, fontFamily: "Lora_700Bold", textAlign: "center", marginBottom: 12 },
  noDataDesc: { fontSize: 15, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  noDataSteps: { width: "100%", gap: 16, borderTopWidth: 1, paddingTop: 24, marginBottom: 32 },
  noDataStep: { flexDirection: "row", alignItems: "center", gap: 14 },
  noDataStepNum: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  noDataStepNumText: { fontSize: 13, fontFamily: "Outfit_700Bold" },
  noDataStepText: { flex: 1, fontSize: 14, fontFamily: "Outfit_400Regular", lineHeight: 20 },
  noDataCTA: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 20, width: "100%" },
  noDataCTAText: { color: "#fff", fontSize: 16, fontFamily: "Outfit_600SemiBold" },
});
