import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useUser } from "@clerk/expo";
import {
  useGetFinancialSummary,
  useGetAccounts,
  useGetRegretScore,
  useGetTodayCheckin,
  useSubmitCheckin,
  useGetAlerts,
  useMarkAlertRead,
  useMarkAllAlertsRead,
} from "@workspace/api-client-react";
import type { AppAlert } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { toFeatherIcon } from "@/utils/iconMapping";

import {
  BoldButton,
  BoldCard,
  BoldText,
  BoldBadge,
  BoldProgress,
  BoldAvatar,
  BoldModal,
  BoldInput,
} from "@/components/bold";
import { useBoldColors } from "@/hooks/useBoldColors";
import RegretMeterWidget from "@/components/RegretMeterWidget";

const { width } = Dimensions.get("window");

// ─── Daily Check-in Card ──────────────────────────────────────────────────────

function DailyCheckinCard() {
  const colors = useBoldColors();
  const queryClient = useQueryClient();
  const { data: todayData, isLoading } = useGetTodayCheckin({ staleTime: 5 * 60 * 1000, retry: 1 });
  const { mutate: submitCheckin, isPending } = useSubmitCheckin({
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkin/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/streaks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      if (result.newAchievements && result.newAchievements.length > 0) {
        setNewAchievement(result.newAchievements[0] as any);
        setShowAchModal(true);
      }
    },
  });

  const [showAchModal, setShowAchModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState<{ icon: string; title: string; description: string } | null>(null);

  if (isLoading) return null;

  const checkin = todayData?.checkin;
  const alreadyDone = !!checkin;

  const healthColor =
    checkin && checkin.healthScore >= 70 ? colors.success :
    checkin && checkin.healthScore >= 40 ? colors.warning : colors.danger;

  return (
    <>
      <BoldCard
        variant={alreadyDone ? "default" : "outlined"}
        style={[
          styles.checkinCard,
          {
            backgroundColor: alreadyDone ? colors.card : colors.primary + "18",
            borderColor: alreadyDone ? colors.border : colors.primary + "40",
          },
        ]}
        padding="md"
      >
        <View style={styles.checkinLeft}>
          <Text style={{ fontSize: 28 }}>{alreadyDone ? (checkin?.moodEmoji ?? "✅") : "☀️"}</Text>
          <View style={{ flex: 1 }}>
            <BoldText variant="bodyLG" weight="700" color={colors.text}>
              {alreadyDone ? "Today's Check-in" : "Daily Check-in"}
            </BoldText>
            <BoldText variant="bodySM" color={colors.mutedForeground} numberOfLines={2}>
              {alreadyDone ? checkin?.summary : "Get your personalized daily financial health read."}
            </BoldText>
          </View>
        </View>

        {alreadyDone ? (
          <View style={[styles.healthScoreBadge, { backgroundColor: healthColor + "20" }]}>
            <BoldText variant="heading2" weight="800" color={healthColor}>
              {checkin?.healthScore}
            </BoldText>
            <BoldText variant="caption" weight="600" color={healthColor}>
              Health
            </BoldText>
          </View>
        ) : (
          <BoldButton
            variant="primary"
            size="sm"
            onPress={() => submitCheckin()}
            disabled={isPending}
            style={styles.checkinBtn}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <BoldText variant="button" color="#fff">Check In</BoldText>
            )}
          </BoldButton>
        )}
      </BoldCard>

      <BoldModal
        visible={showAchModal}
        onClose={() => setShowAchModal(false)}
        size="sm"
        title="Achievement Unlocked!"
        hideHeader={true}
      >
        <View style={[styles.achModalCard, { backgroundColor: colors.card }]}>
          <Text style={styles.achModalEmoji}>{newAchievement?.icon ?? "🏆"}</Text>
          <BoldText variant="heading3" color={colors.text}>Achievement Unlocked!</BoldText>
          <BoldText variant="heading2" weight="800" color={colors.primary}>{newAchievement?.title}</BoldText>
          <BoldText variant="bodyMD" color={colors.mutedForeground}>{newAchievement?.description}</BoldText>
          <BoldButton
            variant="primary"
            size="md"
            fullWidth
            onPress={() => setShowAchModal(false)}
            style={styles.achModalClose}
          >
            <BoldText variant="button" color="#fff">Awesome! 🎉</BoldText>
          </BoldButton>
        </View>
      </BoldModal>
    </>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────

function AlertsPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useBoldColors();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetAlerts({ staleTime: 30_000 });
  const { mutate: markRead } = useMarkAlertRead({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/alerts"] }),
  });
  const { mutate: markAllRead } = useMarkAllAlertsRead({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/alerts"] }),
  });

  const alertTypeIcon = (type: string) => {
    if (type.includes("achievement")) return "award";
    if (type.includes("guardrail")) return "shield";
    if (type.includes("goal")) return "target";
    if (type.includes("streak")) return "zap";
    return "bell";
  };

  const alertTypeColor = (type: string) => {
    if (type.includes("breach")) return colors.danger;
    if (type.includes("warning")) return colors.warning;
    if (type.includes("achievement")) return colors.primary;
    return colors.accent;
  };

  return (
    <BoldModal
      visible={visible}
      onClose={onClose}
      size="xl"
      position="bottom"
      closeOnOverlayPress
      title="Notifications"
      hideHeader={false}
    >
      <View style={styles.alertsHeaderRight}>
        {(data?.unreadCount ?? 0) > 0 && (
          <BoldButton variant="ghost" size="sm" onPress={() => markAllRead()}>
            <BoldText variant="caption" weight="600" color={colors.primary}>Mark all read</BoldText>
          </BoldButton>
        )}
      </View>

      {isLoading && (
        <View style={styles.alertsLoading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {!isLoading && (!data?.alerts || data.alerts.length === 0) && (
        <View style={styles.alertsEmpty}>
          <Feather name="bell-off" size={40} color={colors.border} />
          <BoldText variant="bodyMD" color={colors.mutedForeground}>No notifications yet</BoldText>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.alertsScroll}>
        {data?.alerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            style={[
              styles.alertRow,
              { borderBottomColor: colors.border, backgroundColor: alert.isRead ? "transparent" : colors.primary + "08" },
            ]}
            onPress={() => !alert.isRead && markRead(alert.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.alertIcon, { backgroundColor: alertTypeColor(alert.type) + "20" }]}>
              <Feather name={alertTypeIcon(alert.type) as any} size={16} color={alertTypeColor(alert.type)} />
            </View>
            <View style={styles.alertContent}>
              <BoldText variant="bodySM" weight={alert.isRead ? "500" : "700"} color={colors.text}>
                {alert.title}
              </BoldText>
              <BoldText variant="bodySM" color={colors.mutedForeground} numberOfLines={2}>
                {alert.message}
              </BoldText>
              <BoldText variant="caption" color={colors.mutedForeground}>
                {new Date(alert.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </BoldText>
            </View>
            {!alert.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </BoldModal>
  );
}

// ─── Main Dashboard Screen ────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user } = useUser();
  const colors = useBoldColors();
  const insets = useSafeAreaInsets();
  const [showAlerts, setShowAlerts] = useState(false);

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useGetFinancialSummary();

  const {
    data: accounts,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useGetAccounts();

  const router = useRouter();
  const { data: regretScore } = useGetRegretScore();
  const { data: alertsData } = useGetAlerts({ staleTime: 30_000 });
  const unreadCount = alertsData?.unreadCount ?? 0;

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchSummary(), refetchAccounts()]);
  }, [refetchSummary, refetchAccounts]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (summaryLoading || accountsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <BoldText variant="bodyMD" weight="500" color={colors.mutedForeground}>
              {greeting},
            </BoldText>
            <BoldText variant="heading1" weight="700" color={colors.text}>
              {user?.firstName || user?.username || "Friend"}
            </BoldText>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { borderColor: colors.border }]}
            onPress={() => setShowAlerts(true)}
          >
            <Feather name="bell" size={20} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <BoldText variant="caption" weight="700" color="#fff">
                  {unreadCount > 9 ? "9+" : String(unreadCount)}
                </BoldText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Daily Check-in */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <DailyCheckinCard />
        </View>

        {/* Total Balance Card */}
        <BoldCard variant="elevated" padding="lg" style={styles.balanceCard}>
          <BoldText variant="bodySM" weight="500" color={colors.mutedForeground}>Total Balance</BoldText>
          <BoldText variant="displayMD" weight="700" color={colors.text}>
            ${summary?.totalBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </BoldText>
          {summary && summary.savingsRate !== undefined && (
            <View style={styles.balanceChangeContainer}>
              <Feather
                name={summary.savingsRate >= 0 ? "trending-up" : "trending-down"}
                size={16}
                color={summary.savingsRate >= 0 ? colors.success : colors.danger}
              />
              <BoldText variant="bodySM" weight="600" color={summary.savingsRate >= 0 ? colors.success : colors.danger}>
                {summary.savingsRate >= 0 ? "+" : ""}{summary.savingsRate.toFixed(1)}% savings rate this month
              </BoldText>
            </View>
          )}
        </BoldCard>

        {/* Regret Meter Widget */}
        <RegretMeterWidget />

        {/* Accounts Horizontal Scroll */}
        <View style={styles.section}>
          <BoldText variant="heading3" weight="700" color={colors.text}>Your Accounts</BoldText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsScroll}
          >
            {accounts?.map((account) => (
              <BoldCard
                key={account.id}
                variant="outlined"
                padding="md"
                style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.accountHeader}>
                  <BoldText variant="caption" weight="600" color={colors.mutedForeground}>{account.institutionName}</BoldText>
                  <BoldBadge variant="primary" size="sm">{account.accountType}</BoldBadge>
                </View>
                <BoldText variant="bodyLG" weight="600" color={colors.text}>{account.accountName}</BoldText>
                <BoldText variant="heading3" weight="700" color={colors.text}>
                  ${parseFloat(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </BoldText>
              </BoldCard>
            ))}
          </ScrollView>
        </View>

        {/* Monthly Summary */}
        <View style={styles.summaryRow}>
          <BoldCard variant="default" padding="md" style={styles.summaryCard}>
            <BoldText variant="caption" weight="600" color={colors.mutedForeground}>Income</BoldText>
            <BoldText variant="heading3" weight="700" color={colors.success}>
              +${summary?.totalIncome?.toLocaleString()}
            </BoldText>
          </BoldCard>
          <BoldCard variant="default" padding="md" style={styles.summaryCard}>
            <BoldText variant="caption" weight="600" color={colors.mutedForeground}>Expenses</BoldText>
            <BoldText variant="heading3" weight="700" color={colors.danger}>
              -${summary?.totalExpenses?.toLocaleString()}
            </BoldText>
          </BoldCard>
        </View>

        {/* Savings Rate Pill */}
        <BoldCard variant="outlined" padding="md" style={styles.savingsRateContainer}>
          <View style={styles.savingsRateInner}>
            <Feather name="pie-chart" size={18} color={colors.primary} />
            <BoldText variant="bodyMD" weight="500" color={colors.text}>
              Savings Rate:{' '}
              <BoldText weight="700" color={colors.primary}>{summary?.savingsRate}%</BoldText>
            </BoldText>
          </View>
        </BoldCard>

        {/* Regret Meter Teaser */}
        {regretScore && !regretScore.noData && (
          <TouchableOpacity
            style={[
              styles.regretTeaser,
              {
                backgroundColor:
                  regretScore.level === "low"
                    ? colors.success + "12"
                    : regretScore.level === "medium"
                    ? colors.warning + "12"
                    : colors.danger + "12",
                borderColor:
                  regretScore.level === "low"
                    ? colors.success + "40"
                    : regretScore.level === "medium"
                    ? colors.warning + "40"
                    : colors.danger + "40",
              },
            ]}
            onPress={() => router.push("/(home)/(tabs)/insights")}
            activeOpacity={0.85}
          >
            <View style={styles.regretTeaserLeft}>
              <Text style={{ fontSize: 22 }}>
                {regretScore.level === "low" ? "🟢" : regretScore.level === "medium" ? "🟡" : "🔴"}
              </Text>
              <View>
                <BoldText variant="bodySM" weight="700" color={colors.text}>Regret Score</BoldText>
                <BoldText
                  variant="caption"
                  weight="600"
                  color={
                    regretScore.level === "low"
                      ? colors.success
                      : regretScore.level === "medium"
                      ? colors.warning
                      : colors.danger
                  }
                >
                  {regretScore.level === "low"
                    ? "Safe Zone"
                    : regretScore.level === "medium"
                    ? "Caution"
                    : "High Risk"}{" "}
                  · {regretScore.score}/100
                </BoldText>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* Spending Categories */}
        <View style={styles.section}>
          <BoldText variant="heading3" weight="700" color={colors.text}>Top Spending</BoldText>
          <BoldCard variant="default" padding="lg" style={styles.categoriesCard}>
            {summary?.topCategories?.slice(0, 4).map((cat) => (
              <View key={cat.categoryId} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryIcon, { backgroundColor: cat.categoryColor + "20" }]}>
                    <Feather name={toFeatherIcon(cat.categoryIcon)} size={14} color={cat.categoryColor} />
                  </View>
                  <BoldText variant="bodySM" weight="600" color={colors.text}>{cat.categoryName}</BoldText>
                </View>
                <View style={styles.categoryBarContainer}>
                  <BoldProgress
                    value={cat.percentage}
                    max={100}
                    variant={cat.percentage > 50 ? "warning" : "default"}
                    size="sm"
                    style={styles.categoryBar}
                  />
                  <BoldText variant="caption" weight="600" color={colors.mutedForeground} style={styles.categoryPercent}>
                    {cat.percentage}%
                  </BoldText>
                </View>
              </View>
            ))}
          </BoldCard>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BoldText variant="heading3" weight="700" color={colors.text}>Recent Transactions</BoldText>
            <TouchableOpacity>
              <BoldText variant="bodySM" color={colors.primary}>See All</BoldText>
            </TouchableOpacity>
          </View>
          <BoldCard variant="elevated" padding="md" style={styles.transactionsList}>
            {summary?.recentTransactions?.slice(0, 5).map((tx) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIcon, { backgroundColor: tx.categoryColor ? tx.categoryColor + "20" : colors.border }]}>
                    <Feather name={toFeatherIcon(tx.categoryIcon)} size={16} color={tx.categoryColor || colors.text} />
                  </View>
                  <View>
                    <BoldText variant="bodyMD" weight="600" color={colors.text} numberOfLines={1}>
                      {tx.merchantName || tx.description}
                    </BoldText>
                    <BoldText variant="caption" color={colors.mutedForeground}>
                      {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </BoldText>
                  </View>
                </View>
                <BoldText
                  variant="bodyLG"
                  weight="700"
                  color={tx.type === "debit" ? colors.text : colors.success}
                >
                  {tx.type === "debit" ? "-" : "+"}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </BoldText>
              </View>
            ))}
          </BoldCard>
        </View>
      </ScrollView>

      <AlertsPanel visible={showAlerts} onClose={() => setShowAlerts(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  checkinCard: {
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  checkinLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  checkinBtn: { minWidth: 80 },
  healthScoreBadge: { padding: 10, borderRadius: 14, alignItems: "center", minWidth: 60 },

  achModalCard: { borderRadius: 32, padding: 32, alignItems: "center", width: "100%", maxWidth: 340 },
  achModalEmoji: { fontSize: 64, marginBottom: 16 },
  achModalClose: { marginTop: 24 },

  alertsHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  alertsLoading: { padding: 40, alignItems: "center" },
  alertsEmpty: { padding: 40, alignItems: "center", gap: 12 },
  alertsScroll: { maxHeight: 400 },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  alertIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  alertContent: { flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },

  balanceCard: { marginHorizontal: 20, marginBottom: 24 },
  balanceLabel: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: "700", marginBottom: 12 },
  balanceChangeContainer: { flexDirection: "row", alignItems: "center" },
  balanceChange: { fontSize: 14, fontWeight: "600", marginLeft: 4 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  accountsScroll: { paddingLeft: 20, paddingRight: 10 },
  accountCard: { width: width * 0.7, marginRight: 12 },
  accountHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },

  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 20 },

  savingsRateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  savingsRateInner: { flexDirection: "row", alignItems: "center", gap: 8 },

  regretTeaser: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  regretTeaserLeft: { flexDirection: "row", alignItems: "center", gap: 12 },

  categoriesCard: { marginHorizontal: 20, borderRadius: 24 },
  categoryRow: { marginBottom: 16 },
  categoryInfo: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  categoryIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 10 },
  categoryBarContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  categoryBar: { flex: 1, height: 6, borderRadius: 3 },
  categoryPercent: { fontSize: 12, fontWeight: "600", width: 35 },

  transactionsList: { marginHorizontal: 20, borderRadius: 24 },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  txLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
});