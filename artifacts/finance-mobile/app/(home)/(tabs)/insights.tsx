import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetRegretScore,
  useGenerateRescuePlan,
  useGetLatestRescuePlan,
  useGenerateMoneyStory,
  useGetLatestMoneyStory,
  useGetPatterns,
  useGetTransactionCount,
} from "@workspace/api-client-react";
import type { RegretFactor, RescueAction, BehavioralPattern } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  BoldButton,
  BoldCard,
  BoldText,
  BoldBadge,
  BoldProgress,
  BoldModal,
  BoldAvatar,
} from "@/components/bold";
import { useBoldColors } from "@/hooks/useBoldColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function impactColor(impact: string, colors: ReturnType<typeof useBoldColors>) {
  if (impact === "high") return colors.danger;
  if (impact === "medium") return colors.warning;
  return colors.success;
}

function severityColor(severity: BehavioralPattern["severity"], colors: ReturnType<typeof useBoldColors>) {
  if (severity === "positive") return colors.success;
  if (severity === "warning") return colors.warning;
  return colors.primary;
}

// ─── Behavioral Patterns Section ─────────────────────────────────────────────

function BehavioralPatternsSection() {
  const colors = useBoldColors();
  const { data, isLoading, refetch, isRefetching } = useGetPatterns({
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <BoldCard variant="elevated" padding="lg" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <BoldAvatar size="sm" name="BP" status="online" style={styles.iconCircle} icon={<Feather name="activity" size={20} color={colors.warning} />} />
          <View>
            <BoldText variant="heading3" weight="700" color={colors.text}>Behavioral Patterns</BoldText>
            <BoldText variant="bodySM" color={colors.mutedForeground}>Detected from your transaction history</BoldText>
          </View>
        </View>
        <BoldButton variant="ghost" size="sm" onPress={() => refetch()} disabled={isRefetching}>
          {isRefetching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
          )}
        </BoldButton>
      </View>

      {isLoading && (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
          <BoldText variant="bodyMD" color={colors.mutedForeground}>Analyzing your spending patterns…</BoldText>
        </View>
      )}

      {!isLoading && (!data?.patterns || data.patterns.length === 0) && (
        <View style={styles.emptyState}>
          <BoldText variant="heading3" weight="700" color={colors.text}>No Patterns Yet</BoldText>
          <BoldText variant="bodyMD" color={colors.mutedForeground}>
            Add more transactions to start seeing behavioral patterns.
          </BoldText>
        </View>
      )}

      {data?.patterns && data.patterns.length > 0 && (
        <View style={styles.patternsContainer}>
          {data.patterns.map((pattern) => (
            <PatternCard key={pattern.key} pattern={pattern} severityColor={severityColor} colors={colors} />
          ))}
        </View>
      )}
    </BoldCard>
  );
}

function PatternCard({
  pattern,
  severityColor,
  colors,
}: {
  pattern: BehavioralPattern;
  severityColor: (s: BehavioralPattern["severity"], colors: ReturnType<typeof useBoldColors>) => string;
  colors: ReturnType<typeof useBoldColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = severityColor(pattern.severity, colors);

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
          <BoldText variant="bodyMD" weight="700" color={colors.text}>{pattern.title}</BoldText>
          {pattern.dataPoint && (
            <BoldBadge variant={color === colors.success ? "success" : color === colors.warning ? "warning" : "primary"} size="sm">
              {pattern.dataPoint}
            </BoldBadge>
          )}
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </View>
      {expanded && (
        <BoldText variant="bodySM" color={colors.textSecondary} style={styles.patternDesc}>{pattern.description}</BoldText>
      )}
    </TouchableOpacity>
  );
}

// ─── Regret Score Section ──────────────────────────────────────────────────────

function RegretMeterSection() {
  const colors = useBoldColors();
  const reducedMotion = useReducedMotion();
  const { data: score, isLoading, refetch, isRefetching } = useGetRegretScore({
    staleTime: 3 * 60 * 1000,
    retry: 1,
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

      if (score.level === "high" && !reducedMotion) {
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
  }, [score?.score, score?.level, reducedMotion]);

  if (isLoading) {
    return (
      <BoldCard variant="elevated" padding="lg" style={styles.card}>
        <ActivityIndicator color={colors.primary} />
        <BoldText variant="bodySM" color={colors.mutedForeground} style={styles.loadingText}>Computing your score…</BoldText>
      </BoldCard>
    );
  }

  if (!score) return null;

  if (score.noData) {
    return (
      <BoldCard variant="elevated" padding="lg" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <BoldAvatar size="sm" name="RS" status="offline" style={styles.iconCircle} icon={<Feather name="bar-chart-2" size={20} color={colors.mutedForeground} />} />
            <View>
              <BoldText variant="heading3" weight="700" color={colors.text}>Regret Score</BoldText>
              <BoldText variant="bodySM" color={colors.mutedForeground}>Short-term financial regret risk</BoldText>
            </View>
          </View>
          <BoldButton variant="ghost" size="sm" onPress={() => refetch()} disabled={isRefetching}>
            {isRefetching
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />}
          </BoldButton>
        </View>
        <View style={styles.emptyState}>
          <Feather name="inbox" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
          <BoldText variant="heading3" weight="700" color={colors.text}>No Data Yet</BoldText>
          <BoldText variant="bodyMD" color={colors.mutedForeground}>
            Your Regret Score will appear once you've added at least one month of transactions. Add some transactions to get started.
          </BoldText>
        </View>
      </BoldCard>
    );
  }

  const s = score as Required<typeof score>;
  const color = levelColor(s.level, colors);
  const arcWidth = animScore.interpolate({ inputRange: [0, 1], outputRange: ["2%", "100%"] });

  return (
    <Animated.View style={{ transform: [{ scale: s.level === "high" ? pulseAnim : new Animated.Value(1) }] }}>
      <BoldCard variant="outlined" padding="lg" style={[styles.card, { borderColor: color + "25", borderWidth: 1 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <BoldAvatar
              size="sm"
              name="RS"
              status={s.level === "low" ? "online" : s.level === "medium" ? "busy" : "offline"}
              style={styles.iconCircle}
              icon={
                <Feather
                  name={s.level === "low" ? "check-circle" : s.level === "medium" ? "alert-circle" : "alert-triangle"}
                  size={20}
                  color={color}
                />
              }
            />
            <View>
              <BoldText variant="heading3" weight="700" color={colors.text}>Regret Score</BoldText>
              <BoldText variant="bodySM" color={colors.mutedForeground}>Short-term financial regret risk</BoldText>
            </View>
          </View>
          <BoldButton variant="ghost" size="sm" onPress={() => refetch()} disabled={isRefetching}>
            {isRefetching
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />}
          </BoldButton>
        </View>

        <View style={styles.scoreDisplay}>
          <BoldText variant="displayLG" weight="800" color={color} style={styles.bigScore}>{s.score}</BoldText>
          <View style={styles.scoreRight}>
            <BoldBadge variant={s.level === "low" ? "success" : s.level === "medium" ? "warning" : "danger"} size="md">
              <BoldText variant="caption" weight="700" color={color} style={{ textTransform: "uppercase" }}>
                {levelLabel(s.level)}
              </BoldText>
            </BoldBadge>
            <BoldText variant="bodySM" color={colors.mutedForeground}>out of 100</BoldText>
          </View>
        </View>

        <BoldProgress
          value={s.score}
          max={100}
          variant={s.level === "low" ? "success" : s.level === "medium" ? "warning" : "danger"}
          size="lg"
          animated={!reducedMotion}
          style={styles.progressTrack}
        />

        <View style={styles.markerLabels}>
          <BoldText variant="caption" weight="600" color={colors.success}>Safe</BoldText>
          <BoldText variant="caption" weight="600" color={colors.warning}>Caution</BoldText>
          <BoldText variant="caption" weight="600" color={colors.danger}>Risk</BoldText>
        </View>

        <BoldCard variant="filled" padding="md" style={styles.summaryBox}>
          <BoldText variant="bodyMD" color={colors.text}>{s.summary}</BoldText>
        </BoldCard>

        <BoldText variant="bodyMD" weight="700" color={colors.text} style={styles.factorsTitle}>Contributing Factors</BoldText>
        {s.factors.map((factor: RegretFactor) => (
          <FactorRow key={factor.key} factor={factor} colors={colors} />
        ))}

        <View style={styles.statsGrid}>
          <StatPill label="Savings Rate" value={`${s.savingsRate}%`} color={s.savingsRate >= 15 ? colors.success : colors.warning} colors={colors} />
          <StatPill label="vs Prior Month" value={`${Math.round(s.spendingVelocityRatio * 100)}%`} color={s.spendingVelocityRatio <= 1.05 ? colors.success : colors.danger} colors={colors} />
          <StatPill label="Fixed Costs" value={`${s.recurringBurdenPct}%`} color={s.recurringBurdenPct <= 40 ? colors.success : colors.warning} colors={colors} />
        </View>
      </BoldCard>
    </Animated.View>
  );
}

function FactorRow({ factor, colors }: { factor: RegretFactor; colors: ReturnType<typeof useBoldColors> }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = factor.impact === "positive" ? colors.success : factor.impact === "negative" ? colors.danger : colors.warning;

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
        <BoldText variant="bodyMD" weight="600" color={colors.text}>{factor.label}</BoldText>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
      </View>
      {expanded && (
        <BoldText variant="bodySM" color={colors.mutedForeground} style={styles.factorDesc}>{factor.description}</BoldText>
      )}
    </TouchableOpacity>
  );
}

function StatPill({ label, value, color, colors }: { label: string; value: string; color: string; colors: ReturnType<typeof useBoldColors> }) {
  return (
    <BoldCard variant="filled" padding="md" style={styles.statPill}>
      <BoldText variant="bodyLG" weight="700" color={color}>{value}</BoldText>
      <BoldText variant="caption" color={colors.mutedForeground} style={styles.statLabel}>{label}</BoldText>
    </BoldCard>
  );
}

// ─── Rescue Plan Section ─────────────────────────────────────────────────────

function RescuePlanSection() {
  const colors = useBoldColors();
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
    <BoldCard variant="elevated" padding="lg" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <BoldAvatar size="sm" name="RP" status="online" style={styles.iconCircle} icon={<Feather name="shield" size={20} color={colors.primary} />} />
          <View>
            <BoldText variant="heading3" weight="700" color={colors.text}>Rescue Plan</BoldText>
            <BoldText variant="bodySM" color={colors.mutedForeground}>AI-powered action recommendations</BoldText>
          </View>
        </View>
        <BoldButton variant="primary" size="md" onPress={() => generate()} disabled={isPending}>
          {isPending ? <ActivityIndicator size="small" color="#fff" /> : <BoldText variant="button" color="#fff">{plan ? "Refresh" : "Generate"}</BoldText>}
        </BoldButton>
      </View>

      {!plan && !isPending && (
        <View style={styles.emptyState}>
          <Feather name="zap" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
          <BoldText variant="heading3" weight="700" color={colors.text}>Get Your Rescue Plan</BoldText>
          <BoldText variant="bodyMD" color={colors.mutedForeground}>
            Tap "Generate" to get AI-powered recommendations based on your current financial signals.
          </BoldText>
        </View>
      )}

      {isPending && !plan && (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} />
          <BoldText variant="bodyMD" color={colors.mutedForeground}>
            Analyzing your finances and generating personalized actions…
          </BoldText>
        </View>
      )}

      {plan && (
        <>
          {plan.narrative && (
            <BoldCard variant="outlined" padding="md" style={styles.narrativeBox}>
              <BoldText variant="bodyMD" color={colors.textSecondary} style={styles.narrativeText}>{plan.narrative}</BoldText>
              {plan.aiUnavailable && (
                <View style={styles.aiUnavailableBadge}>
                  <Feather name="cpu" size={11} color={colors.mutedForeground} />
                  <BoldText variant="caption" color={colors.mutedForeground}>AI-generated content unavailable</BoldText>
                </View>
              )}
            </BoldCard>
          )}

          <BoldText variant="bodyMD" weight="700" color={colors.text} style={styles.actionsTitle}>
            {plan.actions.length} Recommended Action{plan.actions.length !== 1 ? "s" : ""}
          </BoldText>

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

          <BoldText variant="caption" color={colors.mutedForeground} style={styles.generatedAt}>
            Generated {new Date(plan.generatedAt).toLocaleDateString()}
          </BoldText>
        </>
      )}
    </BoldCard>
  );
}

function RescueActionCard({
  action,
  colors,
  isExpanded,
  onToggle,
}: {
  action: RescueAction;
  colors: ReturnType<typeof useBoldColors>;
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
          <BoldBadge variant="primary" size="sm">{action.tag}</BoldBadge>
          <BoldText variant="bodyMD" weight="700" color={colors.text}>{action.title}</BoldText>
        </View>
        <View style={styles.actionRight}>
          {action.estimatedSaving != null && (
            <BoldText variant="bodySM" weight="700" color={colors.success}>~${action.estimatedSaving}/mo</BoldText>
          )}
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </View>
      </View>

      {isExpanded && (
        <View style={styles.actionBody}>
          <BoldText variant="bodySM" color={colors.textSecondary}>{action.description}</BoldText>
          <BoldBadge variant={action.impact === "high" ? "danger" : action.impact === "medium" ? "warning" : "success"} size="sm">
            {action.impact.toUpperCase()} IMPACT
          </BoldBadge>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Money Stories Section ───────────────────────────────────────────────────

function MoneyStoriesSection() {
  const colors = useBoldColors();
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
      <View style={styles.noDataIconRow}>
        <View style={[styles.noDataIconBubble, { backgroundColor: colors.accent + "18" }]}>
          <Feather name="book-open" size={36} color={colors.accent} />
        </View>
      </View>
      <BoldText variant="heading2" weight="800" color={colors.text} style={styles.noDataTitle}>Your Story Hasn't Started Yet</BoldText>
      <BoldText variant="bodyMD" color={colors.mutedForeground} style={styles.noDataDesc}>
        Money Stories turns your spending and saving into a personalized financial narrative. Add at least one transaction to get started.
      </BoldText>
      <View style={[styles.noDataSteps, { borderColor: colors.border }]}>
        <View style={styles.noDataStep}>
          <View style={[styles.noDataStepNum, { backgroundColor: colors.primary + "20" }]}>
            <BoldText variant="bodySM" weight="800" color={colors.primary}>1</BoldText>
          </View>
          <BoldText variant="bodySM" color={colors.textSecondary} style={styles.noDataStepText}>Add your first transaction on the Home tab</BoldText>
        </View>
        <View style={styles.noDataStep}>
          <View style={[styles.noDataStepNum, { backgroundColor: colors.primary + "20" }]}>
            <BoldText variant="bodySM" weight="800" color={colors.primary}>2</BoldText>
          </View>
          <BoldText variant="bodySM" color={colors.textSecondary} style={styles.noDataStepText}>Keep logging for a month to build context</BoldText>
        </View>
        <View style={styles.noDataStep}>
          <View style={[styles.noDataStepNum, { backgroundColor: colors.accent + "20" }]}>
            <BoldText variant="bodySM" weight="800" color={colors.accent}>3</BoldText>
          </View>
          <BoldText variant="bodySM" color={colors.textSecondary} style={styles.noDataStepText}>Generate your personalized financial narrative</BoldText>
        </View>
      </View>
      <BoldButton variant="primary" size="lg" fullWidth onPress={() => router.navigate("/")} style={styles.noDataCTA}>
        <BoldText variant="button" color="#fff">
          <Feather name="plus-circle" size={18} color="#fff" style={{ marginRight: 8 }} />Add Your First Transaction
        </BoldText>
      </BoldButton>
    </View>
  );

  return (
    <BoldCard variant="elevated" padding="lg" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <BoldAvatar size="sm" name="MS" status="online" style={styles.iconCircle} icon={<Feather name="book-open" size={20} color={colors.accent} />} />
          <View>
            <BoldText variant="heading3" weight="700" color={colors.text}>Money Stories</BoldText>
            <BoldText variant="bodySM" color={colors.mutedForeground}>Your financial life, narrated</BoldText>
          </View>
        </View>
        {!hasNoTransactions && (
          <BoldButton variant="secondary" size="md" onPress={() => generate()} disabled={isPending}>
            {isPending ? <ActivityIndicator size="small" color="#fff" /> : <BoldText variant="button" color="#fff">{story ? "Refresh" : "Generate"}</BoldText>}
          </BoldButton>
        )}
      </View>

      {hasNoTransactions && noDataContent}

      {!hasNoTransactions && !story && !isPending && (
        <View style={styles.emptyState}>
          <Feather name="book" size={32} color={colors.accent} style={{ marginBottom: 12 }} />
          <BoldText variant="heading3" weight="700" color={colors.text}>Your Financial Story</BoldText>
          <BoldText variant="bodyMD" color={colors.mutedForeground}>
            Turn your last 3 months of transactions into an insightful, personalized narrative. Tap "Generate" to begin.
          </BoldText>
        </View>
      )}

      {!hasNoTransactions && isPending && !story && (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.accent} style={{ marginBottom: 12 }} />
          <BoldText variant="bodyMD" color={colors.mutedForeground}>
            Reading your transaction history and crafting your story…
          </BoldText>
        </View>
      )}

      {!hasNoTransactions && story && (story as any).noData && noDataContent}

      {!hasNoTransactions && story && !(story as any).noData && (
        <View>
          <BoldBadge variant="secondary" size="sm" style={styles.storyPeriod}>
            <Feather name="calendar" size={14} color={colors.accent} style={{ marginRight: 6 }} />{story.periodLabel}
          </BoldBadge>
          <BoldText variant="bodyLG" color={colors.textSecondary} style={styles.storyNarrative}>{story.narrative}</BoldText>
          {story.aiUnavailable && (
            <View style={styles.aiUnavailableBadge}>
              <Feather name="cpu" size={11} color={colors.mutedForeground} />
              <BoldText variant="caption" color={colors.mutedForeground}>AI-generated content unavailable</BoldText>
            </View>
          )}
          <BoldText variant="caption" color={colors.mutedForeground} style={styles.generatedAt}>
            Story generated {new Date(story.generatedAt).toLocaleDateString()}
          </BoldText>
        </View>
      )}
    </BoldCard>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const colors = useBoldColors();
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
        <BoldText variant="displayMD" weight="800" color={colors.text}>Insights</BoldText>
        <BoldText variant="bodyMD" color={colors.mutedForeground}>AI-powered financial intelligence</BoldText>
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

  aiUnavailableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  aiUnavailableText: { fontSize: 11 },

  emptyState: { padding: 24, borderRadius: 20, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: "center" },

  generatedAt: { fontSize: 11, marginTop: 14, textAlign: "right" },

  noDataState: { padding: 24, borderRadius: 20, alignItems: "center" },
  noDataIconRow: { marginBottom: 16 },
  noDataIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  noDataDesc: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 20 },
  noDataSteps: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  noDataStep: { flexDirection: "row", alignItems: "center", gap: 12 },
  noDataStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataStepNumText: { fontSize: 13, fontWeight: "800" },
  noDataStepText: { flex: 1, fontSize: 13, lineHeight: 19 },
  noDataCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    width: "100%",
    justifyContent: "center",
  },
  noDataCTAText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});