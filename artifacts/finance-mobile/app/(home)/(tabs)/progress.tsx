import React, { useState, useRef, useEffect } from "react";
import { shadow } from "@/utils/shadow";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  useGetGoals,
  useGetStreaks,
  useGetAchievements,
  useGetGuardrails,
  useGetGuardrailStanding,
  useCreateGuardrail,
  useDeleteGuardrail,
  useCheckGuardrailAlerts,
  useCreateGoal,
  getGetGoalsQueryKey,
} from "@workspace/api-client-react";
import type { Streak, Achievement, GuardrailStanding } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useQueryClient } from "@tanstack/react-query";
import { Radius } from "@/constants/colors";
import { ScreenHeader, PrimaryButton, haptic } from "@/components/ui";

// ─── Streak Card ──────────────────────────────────────────────────────────────

function StreakCard({ streak, colors }: { streak: Streak; colors: ReturnType<typeof useColors> }) {
  const isActive = streak.currentCount > 0;
  const streakLabels: Record<string, string> = { checkin: "Daily Check-ins" };
  const label = streakLabels[streak.type] ?? streak.type;

  return (
    <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: isActive ? colors.warning + "40" : colors.border }]}>
      <Text style={styles.streakFlame}>{isActive ? "🔥" : "❄️"}</Text>
      <Text style={[styles.streakCount, { color: isActive ? colors.warning : colors.mutedForeground }]}>
        {streak.currentCount}
      </Text>
      <Text style={[styles.streakLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.streakSub, { color: colors.mutedForeground }]}>Best: {streak.longestCount}</Text>
    </View>
  );
}

function StreaksSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { data: streaks, isLoading } = useGetStreaks({ staleTime: 60_000 });

  if (isLoading) return null;
  if (!streaks || streaks.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Streaks</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streaksRow}>
        {streaks.map((s) => (
          <StreakCard key={s.id} streak={s} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────

function AchievementBadge({ ach, colors }: { ach: Achievement; colors: ReturnType<typeof useColors> }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.achBadge,
        {
          backgroundColor: ach.unlocked ? colors.card : colors.cardElevated,
          borderColor: ach.unlocked ? colors.primary + "40" : colors.border,
          opacity: ach.unlocked ? 1 : 0.5,
        },
      ]}
      onPress={() => setShowDetail(true)}
      activeOpacity={0.8}
    >
      <Text style={styles.achEmoji}>{ach.icon}</Text>
      <Text style={[styles.achTitle, { color: ach.unlocked ? colors.text : colors.mutedForeground }]} numberOfLines={1}>
        {ach.title}
      </Text>
      {ach.unlocked && <View style={[styles.achDot, { backgroundColor: colors.accent }]} />}
      <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDetail(false)}>
          <View style={[styles.achDetailCard, { backgroundColor: colors.card }]}>
            <Text style={styles.achDetailEmoji}>{ach.icon}</Text>
            <Text style={[styles.achDetailTitle, { color: colors.text }]}>{ach.title}</Text>
            <Text style={[styles.achDetailDesc, { color: colors.mutedForeground }]}>{ach.description}</Text>
            {ach.unlocked && ach.unlockedAt && (
              <Text style={[styles.achDetailDate, { color: colors.accent }]}>
                Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
              </Text>
            )}
            {!ach.unlocked && (
              <View style={[styles.lockedBadge, { backgroundColor: colors.border }]}>
                <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>🔒 Keep going to unlock</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

function AchievementsSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { data, isLoading } = useGetAchievements({ staleTime: 60_000 });

  if (isLoading) return null;
  if (!data) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🏆 Achievements</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          {data.unlockedCount}/{data.totalCount} unlocked
        </Text>
      </View>
      <View style={styles.achGrid}>
        {data.achievements.map((ach) => (
          <AchievementBadge key={ach.key} ach={ach} colors={colors} />
        ))}
      </View>
    </View>
  );
}

// ─── Guardrails ───────────────────────────────────────────────────────────────

function GuardrailBar({ standing, colors, highlighted }: { standing: GuardrailStanding; colors: ReturnType<typeof useColors>; highlighted?: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: standing.spentPercent / 100,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [standing.spentPercent]);

  React.useEffect(() => {
    if (highlighted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ).start();
    }
  }, [highlighted]);

  const barColor =
    standing.status === "breached" ? colors.danger :
    standing.status === "warning" ? colors.warning : colors.accent;

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const highlightBorder = highlighted
    ? { borderWidth: 2, borderColor: barColor }
    : {};

  return (
    <Animated.View style={[styles.guardrailBar, { backgroundColor: colors.card, opacity: pulseAnim }, highlightBorder]}>
      <View style={styles.guardrailBarHeader}>
        <View style={styles.guardrailBarLeft}>
          <View style={[styles.guardrailDot, { backgroundColor: standing.guardrail.color }]} />
          <Text style={[styles.guardrailBarName, { color: colors.text }]}>{standing.guardrail.categoryName}</Text>
          <View style={[styles.periodChip, { backgroundColor: colors.cardElevated }]}>
            <Text style={[styles.periodChipText, { color: colors.mutedForeground }]}>{standing.guardrail.period}</Text>
          </View>
        </View>
        <View style={styles.guardrailBarRight}>
          {standing.status === "breached" && <Feather name="alert-triangle" size={14} color={colors.danger} />}
          {standing.status === "warning" && <Feather name="alert-circle" size={14} color={colors.warning} />}
          {standing.status === "safe" && <Feather name="check-circle" size={14} color={colors.accent} />}
          <Text style={[styles.guardrailPct, { color: barColor }]}>{standing.spentPercent}%</Text>
        </View>
      </View>
      <View style={[styles.guardrailTrack, { backgroundColor: colors.cardElevated }]}>
        <Animated.View style={[styles.guardrailFill, { backgroundColor: barColor, width }]} />
      </View>
      <View style={styles.guardrailAmounts}>
        <Text style={[styles.guardrailSpent, { color: colors.text }]}>${standing.spent.toFixed(0)} spent</Text>
        <Text style={[styles.guardrailRemaining, { color: colors.mutedForeground }]}>
          {standing.status === "breached"
            ? `$${Math.abs(standing.remaining).toFixed(0)} over limit`
            : `$${standing.remaining.toFixed(0)} remaining`}
        </Text>
      </View>
    </Animated.View>
  );
}

const CATEGORY_OPTIONS = [
  { name: "Food & Dining", color: "#f59e0b" },
  { name: "Entertainment", color: "#8b5cf6" },
  { name: "Shopping", color: "#ec4899" },
  { name: "Transport", color: "#3b82f6" },
  { name: "Healthcare", color: "#10b981" },
  { name: "Personal Care", color: "#f97316" },
  { name: "Utilities", color: "#6366f1" },
  { name: "Other", color: "#64748b" },
];

function GuardrailsSection({ colors, highlightId }: { colors: ReturnType<typeof useColors>; highlightId?: string }) {
  const queryClient = useQueryClient();
  const { data: standing, isLoading } = useGetGuardrailStanding({ staleTime: 60_000 });
  const { mutate: createGuardrail, isPending: creating } = useCreateGuardrail({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guardrails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guardrails/standing"] });
      setShowAdd(false);
      resetForm();
    },
  });
  const { mutate: deleteGuardrail } = useDeleteGuardrail({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guardrails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guardrails/standing"] });
    },
  });
  const { mutate: checkAlerts } = useCheckGuardrailAlerts();

  const [showAdd, setShowAdd] = useState(false);
  const [catName, setCatName] = useState("Food & Dining");
  const [period, setPeriod] = useState("monthly");
  const [limitAmount, setLimitAmount] = useState("");
  const [catColor, setCatColor] = useState("#f59e0b");

  function resetForm() {
    setCatName("Food & Dining");
    setPeriod("monthly");
    setLimitAmount("");
    setCatColor("#f59e0b");
  }

  function handleCreate() {
    if (!limitAmount || isNaN(parseFloat(limitAmount))) return;
    haptic("medium");
    createGuardrail({ categoryName: catName, period, limitAmount: parseFloat(limitAmount), color: catColor });
    checkAlerts();
  }

  function handleDelete(id: number, name: string) {
    Alert.alert("Remove Guardrail", `Remove the guardrail for ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteGuardrail(id) },
    ]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🛡️ Safe Zones</Text>
        <TouchableOpacity
          style={[styles.addSmallBtn, { backgroundColor: colors.primary }]}
          onPress={() => { haptic("light"); setShowAdd(true); }}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}

      {!isLoading && standing && standing.standing.length === 0 && (
        <View style={[styles.emptyGuardrail, { backgroundColor: colors.card }]}>
          <Text style={[styles.emptyGuardrailText, { color: colors.mutedForeground }]}>
            No guardrails set yet. Tap + to create your first spending limit.
          </Text>
        </View>
      )}

      {standing?.standing.map((s) => (
        <TouchableOpacity
          key={s.guardrail.id}
          onLongPress={() => handleDelete(s.guardrail.id, s.guardrail.categoryName)}
          activeOpacity={0.9}
        >
          <GuardrailBar
            standing={s}
            colors={colors}
            highlighted={highlightId === String(s.guardrail.id)}
          />
        </TouchableOpacity>
      ))}

      {standing && standing.standing.length > 0 && (
        <Text style={[styles.guardrailHint, { color: colors.mutedForeground }]}>Long-press a guardrail to remove it</Text>
      )}

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
          <View style={[styles.addModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.addModalTitle, { color: colors.text }]}>Add Safe Zone</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.name}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: catName === opt.name ? opt.color : colors.cardElevated,
                      borderColor: opt.color,
                    },
                  ]}
                  onPress={() => { setCatName(opt.name); setCatColor(opt.color); }}
                >
                  <Text style={[styles.catChipText, { color: catName === opt.name ? "#fff" : colors.text }]}>
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Period</Text>
            <View style={styles.periodRow}>
              {["weekly", "monthly"].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodBtn,
                    {
                      backgroundColor: period === p ? colors.primary : colors.cardElevated,
                      borderColor: period === p ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodBtnText, { color: period === p ? "#fff" : colors.text }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Spending Limit ($)</Text>
            <TextInput
              style={[styles.amountInput, { backgroundColor: colors.cardElevated, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 500"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              value={limitAmount}
              onChangeText={setLimitAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => { setShowAdd(false); resetForm(); }}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: (!limitAmount || creating) ? 0.6 : 1 }]}
                onPress={handleCreate}
                disabled={!limitAmount || creating}
              >
                {creating
                  ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                  : <Text style={[styles.modalSaveText, { color: colors.primaryForeground }]}>Set Guardrail</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Goals Section ────────────────────────────────────────────────────────────

function GoalsSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useGetGoals();
  const activeGoals = goals?.filter((g) => g.status === "active") || [];
  const completedGoals = goals?.filter((g) => g.status === "completed") || [];

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");

  const { mutate: createGoal, isPending: creatingGoal } = useCreateGoal({
    mutation: {
      onSuccess: () => {
        haptic("success");
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
        setShowAddGoal(false);
        setGoalName("");
        setGoalTarget("");
        setGoalSaved("");
      },
      onError: () => Alert.alert("Error", "Could not create the goal. Please try again."),
    },
  });

  const canCreateGoal =
    goalName.trim().length > 0 && !isNaN(parseFloat(goalTarget)) && parseFloat(goalTarget) > 0;

  function handleCreateGoal() {
    if (!canCreateGoal) return;
    createGoal({
      data: {
        name: goalName.trim(),
        targetAmount: String(parseFloat(goalTarget)),
        ...(goalSaved && !isNaN(parseFloat(goalSaved))
          ? { currentAmount: String(parseFloat(goalSaved)) }
          : {}),
      },
    });
  }

  const totalSaved = goals?.reduce((acc, g) => acc + parseFloat(g.currentAmount), 0) || 0;
  const avgCompletion = goals && goals.length > 0
    ? goals.reduce((acc, g) => acc + g.progressPercent, 0) / goals.length
    : 0;

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🎯 Goals</Text>
        <TouchableOpacity
          style={[styles.addSmallBtn, { backgroundColor: colors.primary }]}
          onPress={() => { haptic("light"); setShowAddGoal(true); }}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.statsBar, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{activeGoals.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>${totalSaved.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Saved</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(avgCompletion)}%</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Avg. Progress</Text>
        </View>
      </View>

      {activeGoals.map((item) => <GoalCard key={item.id} item={item} colors={colors} />)}

      {completedGoals.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.subSectionTitle, { color: colors.text }]}>Completed Goals</Text>
          {completedGoals.map((item) => <GoalCard key={item.id} item={item} colors={colors} />)}
        </View>
      )}

      {goals?.length === 0 && (
        <View style={[styles.emptyGoals, { backgroundColor: colors.card }]}>
          <Feather name="target" size={40} color={colors.border} />
          <Text style={[styles.emptyGoalText, { color: colors.mutedForeground }]}>
            No goals yet. Create your first savings goal.
          </Text>
          <PrimaryButton
            label="Create a Goal"
            small
            icon="plus"
            onPress={() => setShowAddGoal(true)}
            style={{ marginTop: 16 }}
          />
        </View>
      )}

      {/* ── Add goal modal ── */}
      <Modal visible={showAddGoal} transparent animationType="slide" onRequestClose={() => setShowAddGoal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.addModal, { backgroundColor: colors.card }]}>
              <Text style={[styles.addModalTitle, { color: colors.text }]}>New Goal</Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>What are you saving for?</Text>
              <TextInput
                style={[styles.amountInput, { backgroundColor: colors.cardElevated, color: colors.text, borderColor: colors.border, marginBottom: 20, fontSize: 16 }]}
                placeholder="e.g. Emergency fund, Vacation…"
                placeholderTextColor={colors.mutedForeground}
                value={goalName}
                onChangeText={setGoalName}
                maxLength={60}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Target Amount ($)</Text>
              <TextInput
                style={[styles.amountInput, { backgroundColor: colors.cardElevated, color: colors.text, borderColor: colors.border, marginBottom: 20 }]}
                placeholder="e.g. 5000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={goalTarget}
                onChangeText={setGoalTarget}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Saved So Far ($ — optional)</Text>
              <TextInput
                style={[styles.amountInput, { backgroundColor: colors.cardElevated, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 500"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={goalSaved}
                onChangeText={setGoalSaved}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowAddGoal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: (!canCreateGoal || creatingGoal) ? 0.6 : 1 }]}
                  onPress={handleCreateGoal}
                  disabled={!canCreateGoal || creatingGoal}
                >
                  {creatingGoal
                    ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                    : <Text style={[styles.modalSaveText, { color: colors.primaryForeground }]}>Create Goal</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function GoalCard({ item, colors }: { item: any; colors: ReturnType<typeof useColors> }) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: Math.min(item.progressPercent, 100) / 100,
      tension: 35,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [item.progressPercent]);

  const fillWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const isCompleted = item.status === "completed";

  return (
    <View style={[styles.goalCard, { backgroundColor: colors.card, borderColor: isCompleted ? colors.accent + "30" : "transparent", borderWidth: 1 }]}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleContainer}>
          <View style={[styles.goalIcon, { backgroundColor: isCompleted ? colors.accent + "20" : colors.primary + "20" }]}>
            <Feather name={isCompleted ? "check" : "target"} size={16} color={isCompleted ? colors.accent : colors.primary} />
          </View>
          <Text style={[styles.goalName, { color: colors.text }]}>{item.name}</Text>
        </View>
        <View style={[styles.percentBadge, { backgroundColor: (isCompleted ? colors.accent : colors.primary) + "20" }]}>
          <Text style={[styles.percentText, { color: isCompleted ? colors.accent : colors.primary }]}>
            {Math.min(Math.round(item.progressPercent), 100)}%
          </Text>
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.cardElevated }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: isCompleted ? colors.accent : colors.primary, width: fillWidth }]} />
      </View>
      <View style={styles.amountRow}>
        <Text style={[styles.amountText, { color: colors.textSecondary }]}>
          ${parseFloat(item.currentAmount).toLocaleString()} saved
        </Text>
        <Text style={[styles.amountText, { color: colors.mutedForeground }]}>
          of ${parseFloat(item.targetAmount).toLocaleString()}
        </Text>
      </View>

      {item.targetDate && (
        <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
          Target: {new Date(item.targetDate).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { guardrailId } = useLocalSearchParams<{ guardrailId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const guardrailSectionY = useRef(0);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/streaks"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/achievements"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/guardrails/standing"] }),
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (guardrailId && scrollRef.current) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: guardrailSectionY.current, animated: true });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [guardrailId]);

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <ScreenHeader title="Progress" subtitle="Streaks, achievements & goals" />

      <StreaksSection colors={colors} />
      <AchievementsSection colors={colors} />
      <View
        onLayout={(e) => {
          guardrailSectionY.current = e.nativeEvent.layout.y;
        }}
      >
        <GuardrailsSection colors={colors} highlightId={guardrailId} />
      </View>
      <GoalsSection colors={colors} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  sectionTitle: { fontSize: 19, fontFamily: "Outfit_700Bold", letterSpacing: -0.3 },
  sectionSub: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  subSectionTitle: { fontSize: 17, fontFamily: "Outfit_700Bold", marginBottom: 16, marginTop: 8, letterSpacing: -0.2 },

  streaksRow: { gap: 14 },
  streakCard: {
    width: 118,
    padding: 18,
    borderRadius: Radius.lg,
    alignItems: "center",
    borderWidth: 1,
    ...shadow({ opacity: 0.04, radius: 14, offsetY: 5, elevation: 2 }),
  },
  streakFlame: { fontSize: 32, marginBottom: 8 },
  streakCount: { fontSize: 40, fontFamily: "Outfit_800Black" },
  streakLabel: { fontSize: 13, fontFamily: "Outfit_600SemiBold", textAlign: "center", marginTop: 6 },
  streakSub: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 4 },

  achGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  achBadge: {
    width: "31.5%",
    padding: 16,
    borderRadius: Radius.md,
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  achEmoji: { fontSize: 32, marginBottom: 8 },
  achTitle: { fontSize: 12, fontFamily: "Outfit_600SemiBold", textAlign: "center" },
  achDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  achDetailCard: { borderRadius: Radius.xl, padding: 32, alignItems: "center", width: "100%", maxWidth: 340, ...shadow({ offsetY: 10, opacity: 0.15, radius: 24 }) },
  achDetailEmoji: { fontSize: 64, marginBottom: 16 },
  achDetailTitle: { fontSize: 24, fontFamily: "Lora_700Bold", marginBottom: 10 },
  achDetailDesc: { fontSize: 16, lineHeight: 24, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 16 },
  achDetailDate: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  lockedBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  lockedText: { fontSize: 14, fontFamily: "Outfit_500Medium" },

  guardrailBar: { borderRadius: Radius.lg, padding: 20, marginBottom: 14, ...shadow({ opacity: 0.04, radius: 14, offsetY: 5, elevation: 2 }) },
  guardrailBarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  guardrailBarLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  guardrailDot: { width: 12, height: 12, borderRadius: 6 },
  guardrailBarName: { fontSize: 16, fontFamily: "Outfit_600SemiBold", flex: 1 },
  periodChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  periodChipText: { fontSize: 11, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase" },
  guardrailBarRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  guardrailPct: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  guardrailTrack: { height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 12 },
  guardrailFill: { height: "100%", borderRadius: 5 },
  guardrailAmounts: { flexDirection: "row", justifyContent: "space-between" },
  guardrailSpent: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  guardrailRemaining: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  guardrailHint: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", marginTop: 8 },

  emptyGuardrail: { borderRadius: 20, padding: 24, alignItems: "center" },
  emptyGuardrailText: { fontSize: 15, fontFamily: "Outfit_400Regular", lineHeight: 22, textAlign: "center" },

  addSmallBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },

  addModal: { borderRadius: Radius.xl, padding: 26, width: "100%", maxWidth: 380, ...shadow({ offsetY: 10, opacity: 0.15, radius: 24 }) },
  addModalTitle: { fontSize: 23, fontFamily: "Outfit_700Bold", marginBottom: 22, letterSpacing: -0.4 },
  fieldLabel: { fontSize: 13, fontFamily: "Outfit_600SemiBold", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 10,
  },
  catChipText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  periodRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  periodBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center", borderWidth: 1 },
  periodBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  amountInput: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    fontSize: 18,
    fontFamily: "Outfit_400Regular",
    marginBottom: 28,
  },
  modalActions: { flexDirection: "row", gap: 16 },
  modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 20, alignItems: "center", borderWidth: 1 },
  modalCancelText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  modalSaveBtn: { flex: 1, paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  modalSaveText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },

  statsBar: { flexDirection: "row", padding: 22, borderRadius: Radius.lg, marginBottom: 20, alignItems: "center", ...shadow({ opacity: 0.04, radius: 14, offsetY: 5, elevation: 2 }) },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontFamily: "Outfit_700Bold", marginBottom: 6 },
  statLabel: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  statDivider: { width: 1, height: 40 },

  goalCard: { borderRadius: Radius.lg, padding: 20, marginBottom: 14, ...shadow({ opacity: 0.04, radius: 14, offsetY: 5, elevation: 2 }) },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  goalTitleContainer: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  goalIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  goalName: { fontSize: 17, fontFamily: "Outfit_600SemiBold", flex: 1 },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  percentText: { fontSize: 13, fontFamily: "Outfit_700Bold" },
  progressBar: { height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 12 },
  progressFill: { height: "100%", borderRadius: 5 },
  amountRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  amountText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  dateText: { fontSize: 13, fontFamily: "Outfit_400Regular", marginTop: 4 },

  emptyGoals: { borderRadius: 24, padding: 48, alignItems: "center" },
  emptyGoalText: { fontSize: 15, fontFamily: "Outfit_400Regular", textAlign: "center", marginTop: 16, maxWidth: 220, lineHeight: 22 },
});
