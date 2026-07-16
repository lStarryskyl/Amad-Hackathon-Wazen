import React, { useState, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  useGetGoals,
  useGetStreaks,
  useGetAchievements,
  useGetGuardrailStanding,
  useCreateGuardrail,
  useDeleteGuardrail,
  useCheckGuardrailAlerts,
} from "@workspace/api-client-react";
import type { Streak, Achievement, GuardrailStanding } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useBoldColors } from "@/hooks/useBoldColors";
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

// ─── Streak Card ──────────────────────────────────────────────────────────────

function StreakCard({ streak, colors }: { streak: Streak; colors: ReturnType<typeof useBoldColors> }) {
  const isActive = streak.currentCount > 0;
  const streakLabels: Record<string, string> = { checkin: "Daily Check-ins" };

  return (
    <BoldCard
      variant="outlined"
      padding="md"
      style={{
        width: 110,
        alignItems: "center",
        borderColor: isActive ? colors.warning + "40" : colors.border,
      }}
    >
      <BoldText variant="displayLG" style={{ marginBottom: 6 }}>
        {isActive ? "🔥" : "❄️"}
      </BoldText>
      <BoldText
        variant="displayMD"
        weight="800"
        color={isActive ? colors.warning : colors.mutedForeground}
      >
        {streak.currentCount}
      </BoldText>
      <BoldText variant="bodySM" weight="600" color={colors.text} style={{ textAlign: "center", marginTop: 4 }}>
        {streakLabels[streak.type] ?? streak.type}
      </BoldText>
      <BoldText variant="caption" color={colors.mutedForeground} style={{ marginTop: 2 }}>
        Best: {streak.longestCount}
      </BoldText>
    </BoldCard>
  );
}

function StreaksSection({ colors }: { colors: ReturnType<typeof useBoldColors> }) {
  const { data: streaks, isLoading } = useGetStreaks({ staleTime: 60_000 });

  if (isLoading) return null;
  if (!streaks || streaks.length === 0) return null;

  return (
    <View style={{ marginBottom: 28 }}>
      <BoldText variant="heading2" weight="700" color={colors.text} style={{ marginBottom: 14 }}>
        🔥 Streaks
      </BoldText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {streaks.map((s) => (
          <StreakCard key={s.id} streak={s} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────

function AchievementBadge({ ach, colors }: { ach: Achievement; colors: ReturnType<typeof useBoldColors> }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={{
          width: "31%",
          padding: 12,
          borderRadius: 16,
          alignItems: "center",
          borderWidth: 1,
          backgroundColor: ach.unlocked ? colors.card : colors.cardElevated,
          borderColor: ach.unlocked ? colors.primary + "40" : colors.border,
          opacity: ach.unlocked ? 1 : 0.5,
        }}
        onPress={() => setShowDetail(true)}
        activeOpacity={0.8}
      >
        <BoldText variant="displayLG" style={{ marginBottom: 6 }}>{ach.icon}</BoldText>
        <BoldText variant="bodySM" weight="600" color={ach.unlocked ? colors.text : colors.mutedForeground} style={{ textAlign: "center" }} numberOfLines={1}>
          {ach.title}
        </BoldText>
        {ach.unlocked && (
          <View style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
        )}
      </TouchableOpacity>

      <BoldModal visible={showDetail} onClose={() => setShowDetail(false)} title={ach.title} size="sm">
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <BoldText variant="displayXL" style={{ marginBottom: 12 }}>{ach.icon}</BoldText>
          <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ textAlign: "center", lineHeight: 22, marginBottom: 12 }}>
            {ach.description}
          </BoldText>
          {ach.unlocked && ach.unlockedAt && (
            <BoldBadge variant="success" size="md">
              Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
            </BoldBadge>
          )}
          {!ach.unlocked && (
            <BoldBadge variant="default" size="md">
              Keep going to unlock
            </BoldBadge>
          )}
        </View>
      </BoldModal>
    </>
  );
}

function AchievementsSection({ colors }: { colors: ReturnType<typeof useBoldColors> }) {
  const { data, isLoading } = useGetAchievements({ staleTime: 60_000 });

  if (isLoading) return null;
  if (!data) return null;

  return (
    <View style={{ marginBottom: 28 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <BoldText variant="heading2" weight="700" color={colors.text}>
          🏆 Achievements
        </BoldText>
        <BoldText variant="bodySM" color={colors.mutedForeground}>
          {data.unlockedCount}/{data.totalCount} unlocked
        </BoldText>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {data.achievements.map((ach) => (
          <AchievementBadge key={ach.key} ach={ach} colors={colors} />
        ))}
      </View>
    </View>
  );
}

// ─── Guardrails ───────────────────────────────────────────────────────────────

function GuardrailBar({ standing, colors, highlighted }: { standing: GuardrailStanding; colors: ReturnType<typeof useBoldColors>; highlighted?: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: standing.spentPercent / 100,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [standing.spentPercent]);

  useEffect(() => {
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
    standing.status === "warning" ? colors.warning : colors.success;

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const highlightBorder = highlighted ? { borderWidth: 2, borderColor: barColor } : {};

  const statusIcon = standing.status === "breached" ? "alert-triangle" :
    standing.status === "warning" ? "alert-circle" : "check-circle";

  return (
    <Animated.View style={[{ marginBottom: 12 }, { opacity: pulseAnim }]}>
      <BoldCard variant="outlined" padding="md" style={{ borderWidth: highlighted ? 2 : 1, borderColor: highlighted ? barColor : colors.border }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: standing.guardrail.color }} />
            <BoldText variant="bodyMD" weight="600" color={colors.text} style={{ flex: 1 }} numberOfLines={1}>
              {standing.guardrail.categoryName}
            </BoldText>
            <BoldBadge variant="default" size="sm">
              {standing.guardrail.period}
            </BoldBadge>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name={statusIcon as any} size={14} color={barColor} />
            <BoldText variant="bodyMD" weight="700" color={barColor}>
              {standing.spentPercent}%
            </BoldText>
          </View>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.cardElevated, overflow: "hidden", marginBottom: 8 }}>
          <Animated.View style={{ height: "100%", borderRadius: 4, backgroundColor: barColor, width }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <BoldText variant="bodySM" weight="600" color={colors.text}>
            ${standing.spent.toFixed(0)} spent
          </BoldText>
          <BoldText variant="bodySM" color={colors.mutedForeground}>
            {standing.status === "breached"
              ? `$${Math.abs(standing.remaining).toFixed(0)} over limit`
              : `$${standing.remaining.toFixed(0)} remaining`}
          </BoldText>
        </View>
      </BoldCard>
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

function GuardrailsSection({ colors, highlightId }: { colors: ReturnType<typeof useBoldColors>; highlightId?: string }) {
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
    <View style={{ marginBottom: 28 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <BoldText variant="heading2" weight="700" color={colors.text}>
          🛡️ Safe Zones
        </BoldText>
        <BoldButton variant="primary" size="sm" onPress={() => setShowAdd(true)}>
          <Feather name="plus" size={16} color="#fff" />
        </BoldButton>
      </View>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}

      {!isLoading && standing && standing.standing.length === 0 && (
        <BoldCard variant="outlined" padding="lg" style={{ alignItems: "center" }}>
          <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ textAlign: "center" }}>
            No guardrails set yet. Tap + to create your first spending limit.
          </BoldText>
        </BoldCard>
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
        <BoldText variant="caption" color={colors.mutedForeground} style={{ textAlign: "center", marginTop: 4 }}>
          Long-press a guardrail to remove it
        </BoldText>
      )}

      <BoldModal visible={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title="Add Safe Zone" size="sm">
        <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 8 }}>
          CATEGORY
        </BoldText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {CATEGORY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.name}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: opt.color,
                backgroundColor: catName === opt.name ? opt.color : colors.cardElevated,
                marginRight: 8,
              }}
              onPress={() => { setCatName(opt.name); setCatColor(opt.color); }}
            >
              <BoldText variant="bodySM" weight="600" color={catName === opt.name ? "#fff" : colors.text}>
                {opt.name}
              </BoldText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 8 }}>
          PERIOD
        </BoldText>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          {["weekly", "monthly"].map((p) => (
            <TouchableOpacity
              key={p}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                backgroundColor: period === p ? colors.primary : colors.cardElevated,
                borderColor: period === p ? colors.primary : colors.border,
              }}
              onPress={() => setPeriod(p)}
            >
              <BoldText variant="bodyMD" weight="600" color={period === p ? "#fff" : colors.text}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </BoldText>
            </TouchableOpacity>
          ))}
        </View>

        <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 8 }}>
          SPENDING LIMIT ($)
        </BoldText>
        <TextInput
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            backgroundColor: colors.cardElevated,
            marginBottom: 24,
          }}
          placeholder="e.g. 500"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          value={limitAmount}
          onChangeText={setLimitAmount}
        />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <BoldButton
            variant="outline"
            size="md"
            style={{ flex: 1 }}
            onPress={() => { setShowAdd(false); resetForm(); }}
          >
            Cancel
          </BoldButton>
          <BoldButton
            variant="primary"
            size="md"
            style={{ flex: 1 }}
            onPress={handleCreate}
            disabled={!limitAmount || creating}
            loading={creating}
          >
            Set Guardrail
          </BoldButton>
        </View>
      </BoldModal>
    </View>
  );
}

// ─── Goals Section ────────────────────────────────────────────────────────────

function GoalsSection({ colors }: { colors: ReturnType<typeof useBoldColors> }) {
  const { data: goals, isLoading } = useGetGoals();
  const activeGoals = goals?.filter((g) => g.status === "active") || [];
  const completedGoals = goals?.filter((g) => g.status === "completed") || [];

  const totalSaved = goals?.reduce((acc, g) => acc + parseFloat(g.currentAmount), 0) || 0;
  const avgCompletion = goals && goals.length > 0
    ? goals.reduce((acc, g) => acc + g.progressPercent, 0) / goals.length
    : 0;

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />;

  return (
    <View style={{ marginBottom: 28 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <BoldText variant="heading2" weight="700" color={colors.text}>
          🎯 Goals
        </BoldText>
        <BoldButton variant="primary" size="sm">
          <Feather name="plus" size={16} color="#fff" />
        </BoldButton>
      </View>

      <BoldCard variant="elevated" padding="lg" style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <BoldText variant="bodyLG" weight="700" color={colors.text} style={{ marginBottom: 4 }}>
              {activeGoals.length}
            </BoldText>
            <BoldText variant="bodySM" color={colors.mutedForeground}>Active</BoldText>
          </View>
          <View style={{ width: 1, height: 30, backgroundColor: colors.border }} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <BoldText variant="bodyLG" weight="700" color={colors.text} style={{ marginBottom: 4 }}>
              ${totalSaved.toLocaleString()}
            </BoldText>
            <BoldText variant="bodySM" color={colors.mutedForeground}>Saved</BoldText>
          </View>
          <View style={{ width: 1, height: 30, backgroundColor: colors.border }} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <BoldText variant="bodyLG" weight="700" color={colors.text} style={{ marginBottom: 4 }}>
              {Math.round(avgCompletion)}%
            </BoldText>
            <BoldText variant="bodySM" color={colors.mutedForeground}>Avg. Progress</BoldText>
          </View>
        </View>
      </BoldCard>

      {activeGoals.map((item) => <GoalCard key={item.id} item={item} colors={colors} />)}

      {completedGoals.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <BoldText variant="heading3" weight="700" color={colors.text} style={{ marginBottom: 12 }}>
            Completed Goals
          </BoldText>
          {completedGoals.map((item) => <GoalCard key={item.id} item={item} colors={colors} />)}
        </View>
      )}

      {goals?.length === 0 && (
        <BoldCard variant="outlined" padding="lg" style={{ alignItems: "center", paddingVertical: 40 }}>
          <Feather name="target" size={40} color={colors.border} style={{ marginBottom: 12 }} />
          <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ textAlign: "center", maxWidth: 200 }}>
            No goals yet. Tap + to create your first goal.
          </BoldText>
        </BoldCard>
      )}
    </View>
  );
}

function GoalCard({ item, colors }: { item: any; colors: ReturnType<typeof useBoldColors> }) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: Math.min(item.progressPercent, 100) / 100,
      tension: 35,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [item.progressPercent]);

  const fillWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const isCompleted = item.status === "completed";
  const accentColor = isCompleted ? colors.success : colors.primary;

  return (
    <BoldCard variant="outlined" padding="lg" style={{ marginBottom: 14, borderColor: isCompleted ? colors.success + "30" : colors.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: accentColor + "20" }}>
            <Feather name={isCompleted ? "check" : "target"} size={16} color={accentColor} />
          </View>
          <BoldText variant="bodyMD" weight="600" color={colors.text} style={{ flex: 1 }} numberOfLines={1}>
            {item.name}
          </BoldText>
        </View>
        <BoldBadge variant={isCompleted ? "success" : "primary"} size="sm">
          {Math.min(Math.round(item.progressPercent), 100)}%
        </BoldBadge>
      </View>

      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.cardElevated, overflow: "hidden", marginBottom: 8 }}>
        <Animated.View style={{ height: "100%", borderRadius: 4, backgroundColor: accentColor, width: fillWidth }} />
      </View>

      <View style={{ flexDirection: "row", gap: 4, marginBottom: 6 }}>
        <BoldText variant="bodySM" weight="600" color={colors.textSecondary}>
          ${parseFloat(item.currentAmount).toLocaleString()} saved
        </BoldText>
        <BoldText variant="bodySM" color={colors.mutedForeground}>
          of ${parseFloat(item.targetAmount).toLocaleString()}
        </BoldText>
      </View>

      {item.targetDate && (
        <BoldText variant="caption" color={colors.mutedForeground}>
          Target: {new Date(item.targetDate).toLocaleDateString()}
        </BoldText>
      )}
    </BoldCard>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const colors = useBoldColors();
  const insets = useSafeAreaInsets();
  const { guardrailId } = useLocalSearchParams<{ guardrailId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const guardrailSectionY = useRef(0);

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
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 24 }}>
        <BoldText variant="displayMD" weight="800" color={colors.text}>
          Progress
        </BoldText>
        <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ marginTop: 4 }}>
          Streaks, achievements & goals
        </BoldText>
      </View>

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
