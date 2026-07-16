import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
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
import { useColors } from "@/hooks/useColors";
import { toFeatherIcon } from "@/utils/iconMapping";
import RegretMeterWidget from "@/components/RegretMeterWidget";
import { useQueryClient } from "@tanstack/react-query";

const { width } = Dimensions.get("window");

// ─── Daily Check-in Card ──────────────────────────────────────────────────────

function DailyCheckinCard() {
  const colors = useColors();
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
    checkin && checkin.healthScore >= 70 ? colors.accent :
    checkin && checkin.healthScore >= 40 ? colors.warning : colors.danger;

  return (
    <>
      <View style={[styles.checkinCard, { backgroundColor: alreadyDone ? colors.card : colors.primary + "18", borderColor: alreadyDone ? colors.border : colors.primary + "40" }]}>
        <View style={styles.checkinLeft}>
          <Text style={{ fontSize: 28 }}>{alreadyDone ? (checkin?.moodEmoji ?? "✅") : "☀️"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.checkinTitle, { color: colors.text }]}>
              {alreadyDone ? "Today's Check-in" : "Daily Check-in"}
            </Text>
            {alreadyDone ? (
              <Text style={[styles.checkinSummary, { color: colors.mutedForeground }]} numberOfLines={2}>
                {checkin?.summary}
              </Text>
            ) : (
              <Text style={[styles.checkinSummary, { color: colors.mutedForeground }]}>
                Get your personalized daily financial health read.
              </Text>
            )}
          </View>
        </View>

        {alreadyDone ? (
          <View style={[styles.healthScoreBadge, { backgroundColor: healthColor + "20" }]}>
            <Text style={[styles.healthScoreNum, { color: healthColor }]}>{checkin?.healthScore}</Text>
            <Text style={[styles.healthScoreLabel, { color: healthColor }]}>Health</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.checkinBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 }]}
            onPress={() => submitCheckin()}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.checkinBtnText}>Check In</Text>}
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showAchModal} transparent animationType="fade" onRequestClose={() => setShowAchModal(false)}>
        <TouchableOpacity style={styles.achModalOverlay} activeOpacity={1} onPress={() => setShowAchModal(false)}>
          <View style={[styles.achModalCard, { backgroundColor: colors.card }]}>
            <Text style={styles.achModalEmoji}>{newAchievement?.icon ?? "🏆"}</Text>
            <Text style={[styles.achModalTitle, { color: colors.text }]}>Achievement Unlocked!</Text>
            <Text style={[styles.achModalName, { color: colors.primary }]}>{newAchievement?.title}</Text>
            <Text style={[styles.achModalDesc, { color: colors.mutedForeground }]}>{newAchievement?.description}</Text>
            <TouchableOpacity
              style={[styles.achModalClose, { backgroundColor: colors.primary }]}
              onPress={() => setShowAchModal(false)}
            >
              <Text style={styles.achModalCloseText}>Awesome! 🎉</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────

function AlertsPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.alertsOverlay}>
        <View style={[styles.alertsPanel, { backgroundColor: colors.background }]}>
          <View style={[styles.alertsHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.alertsTitle, { color: colors.text }]}>Notifications</Text>
            <View style={styles.alertsHeaderRight}>
              {(data?.unreadCount ?? 0) > 0 && (
                <TouchableOpacity onPress={() => markAllRead()} style={[styles.markAllBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.cardElevated }]}>
                <Feather name="x" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {isLoading && (
            <View style={styles.alertsLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {!isLoading && (!data?.alerts || data.alerts.length === 0) && (
            <View style={styles.alertsEmpty}>
              <Feather name="bell-off" size={40} color={colors.border} />
              <Text style={[styles.alertsEmptyText, { color: colors.mutedForeground }]}>No notifications yet</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
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
                  <Text style={[styles.alertTitle, { color: colors.text, fontWeight: alert.isRead ? "500" : "700" }]}>
                    {alert.title}
                  </Text>
                  <Text style={[styles.alertMessage, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {alert.message}
                  </Text>
                  <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>
                    {new Date(alert.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                {!alert.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const { user } = useUser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showAlerts, setShowAlerts] = useState(false);

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary
  } = useGetFinancialSummary();

  const {
    data: accounts,
    isLoading: accountsLoading,
    refetch: refetchAccounts
  } = useGetAccounts();

  const router = useRouter();
  const { data: regretScore } = useGetRegretScore();
  const { data: alertsData } = useGetAlerts({ staleTime: 30_000 });
  const unreadCount = alertsData?.unreadCount ?? 0;

  const onRefresh = React.useCallback(async () => {
    await Promise.all([refetchSummary(), refetchAccounts()]);
  }, []);

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
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting},</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.firstName || user?.username || "Friend"}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { borderColor: colors.border }]}
            onPress={() => setShowAlerts(true)}
          >
            <Feather name="bell" size={20} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Daily Check-in */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <DailyCheckinCard />
        </View>

        {/* Total Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Total Balance</Text>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            ${summary?.totalBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {summary && summary.savingsRate !== undefined && (
            <View style={styles.balanceChangeContainer}>
              <Feather
                name={summary.savingsRate >= 0 ? "trending-up" : "trending-down"}
                size={16}
                color={summary.savingsRate >= 0 ? colors.accent : colors.danger}
              />
              <Text style={[styles.balanceChange, { color: summary.savingsRate >= 0 ? colors.accent : colors.danger }]}>
                {summary.savingsRate >= 0 ? "+" : ""}{summary.savingsRate.toFixed(1)}% savings rate this month
              </Text>
            </View>
          )}
        </View>

        {/* Regret Meter Widget */}
        <RegretMeterWidget />

        {/* Accounts Horizontal Scroll */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Accounts</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsScroll}
          >
            {accounts?.map((account) => (
              <View key={account.id} style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.accountHeader}>
                  <Text style={[styles.institution, { color: colors.mutedForeground }]}>{account.institutionName}</Text>
                  <View style={[styles.accountTypeChip, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.accountType, { color: colors.primary }]}>{account.accountType}</Text>
                  </View>
                </View>
                <Text style={[styles.accountName, { color: colors.text }]}>{account.accountName}</Text>
                <Text style={[styles.accountBalance, { color: colors.text }]}>
                  ${parseFloat(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Monthly Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.accent }]}>
              +${summary?.totalIncome?.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              -${summary?.totalExpenses?.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Savings Rate Pill */}
        <View style={[styles.savingsRateContainer, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Feather name="pie-chart" size={18} color={colors.primary} />
          <Text style={[styles.savingsRateText, { color: colors.text }]}>
            Savings Rate: <Text style={{ color: colors.primary, fontWeight: "700" }}>{summary?.savingsRate}%</Text>
          </Text>
        </View>

        {/* Regret Meter Teaser */}
        {regretScore && !regretScore.noData && (
          <TouchableOpacity
            style={[
              styles.regretTeaser,
              {
                backgroundColor:
                  regretScore.level === "low"
                    ? colors.accent + "12"
                    : regretScore.level === "medium"
                    ? colors.warning + "12"
                    : colors.danger + "12",
                borderColor:
                  regretScore.level === "low"
                    ? colors.accent + "40"
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
                <Text style={[styles.regretTeaserTitle, { color: colors.text }]}>Regret Meter</Text>
                <Text
                  style={[
                    styles.regretTeaserLevel,
                    {
                      color:
                        regretScore.level === "low"
                          ? colors.accent
                          : regretScore.level === "medium"
                          ? colors.warning
                          : colors.danger,
                    },
                  ]}
                >
                  {regretScore.level === "low"
                    ? "Safe Zone"
                    : regretScore.level === "medium"
                    ? "Caution"
                    : "High Risk"}{" "}
                  · {regretScore.score}/100
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* Spending Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Spending</Text>
          <View style={[styles.categoriesCard, { backgroundColor: colors.card }]}>
            {summary?.topCategories?.slice(0, 4).map((cat) => (
              <View key={cat.categoryId} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryIcon, { backgroundColor: cat.categoryColor + "20" }]}>
                    <Feather name={toFeatherIcon(cat.categoryIcon)} size={14} color={cat.categoryColor} />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{cat.categoryName}</Text>
                </View>
                <View style={styles.categoryBarContainer}>
                  <View style={[styles.categoryBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          backgroundColor: cat.categoryColor,
                          width: `${cat.percentage}%`
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.categoryPercent, { color: colors.mutedForeground }]}>{cat.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={{ color: colors.primary }}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.transactionsList, { backgroundColor: colors.card }]}>
            {summary?.recentTransactions?.slice(0, 5).map((tx) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIcon, { backgroundColor: tx.categoryColor ? tx.categoryColor + "20" : colors.border }]}>
                    <Feather name={toFeatherIcon(tx.categoryIcon)} size={16} color={tx.categoryColor || colors.text} />
                  </View>
                  <View>
                    <Text style={[styles.txMerchant, { color: colors.text }]} numberOfLines={1}>
                      {tx.merchantName || tx.description}
                    </Text>
                    <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                      {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <Text style={[
                  styles.txAmount,
                  { color: tx.type === 'debit' ? colors.text : colors.accent }
                ]}>
                  {tx.type === 'debit' ? '-' : '+'}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
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
  greeting: { fontSize: 14, fontWeight: "500" },
  userName: { fontSize: 24, fontWeight: "700" },
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
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  checkinCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
  },
  checkinLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  checkinTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  checkinSummary: { fontSize: 12, lineHeight: 16 },
  checkinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 80,
    alignItems: "center",
  },
  checkinBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  healthScoreBadge: { padding: 10, borderRadius: 14, alignItems: "center", minWidth: 60 },
  healthScoreNum: { fontSize: 22, fontWeight: "800" },
  healthScoreLabel: { fontSize: 10, fontWeight: "600", marginTop: 2 },

  achModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  achModalCard: { borderRadius: 32, padding: 32, alignItems: "center", width: "100%", maxWidth: 340 },
  achModalEmoji: { fontSize: 64, marginBottom: 16 },
  achModalTitle: { fontSize: 14, fontWeight: "600", marginBottom: 6, opacity: 0.7 },
  achModalName: { fontSize: 24, fontWeight: "800", marginBottom: 10 },
  achModalDesc: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 24 },
  achModalClose: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 },
  achModalCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  alertsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  alertsPanel: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%", minHeight: "50%" },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  alertsTitle: { fontSize: 20, fontWeight: "700" },
  alertsHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  markAllText: { fontSize: 13, fontWeight: "600" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  alertsLoading: { padding: 40, alignItems: "center" },
  alertsEmpty: { padding: 40, alignItems: "center", gap: 12 },
  alertsEmptyText: { fontSize: 15 },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  alertIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, marginBottom: 3 },
  alertMessage: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  alertTime: { fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },

  balanceCard: { marginHorizontal: 20, padding: 24, borderRadius: 24, marginBottom: 24 },
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
  sectionTitle: { fontSize: 18, fontWeight: "700", paddingHorizontal: 20, marginBottom: 16 },
  accountsScroll: { paddingLeft: 20, paddingRight: 10 },
  accountCard: { width: width * 0.7, padding: 20, borderRadius: 20, marginRight: 12, borderWidth: 1 },
  accountHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  institution: { fontSize: 12, fontWeight: "600" },
  accountTypeChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  accountType: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  accountName: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  accountBalance: { fontSize: 20, fontWeight: "700" },

  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 20 },
  summaryLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: "700" },

  savingsRateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  savingsRateText: { fontSize: 15, fontWeight: "500" },

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
  regretTeaserTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  regretTeaserLevel: { fontSize: 13, fontWeight: "600" },

  categoriesCard: { marginHorizontal: 20, padding: 20, borderRadius: 24 },
  categoryRow: { marginBottom: 16 },
  categoryInfo: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  categoryIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 10 },
  categoryName: { fontSize: 14, fontWeight: "600" },
  categoryBarContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  categoryBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  categoryBarFill: { height: "100%", borderRadius: 3 },
  categoryPercent: { fontSize: 12, fontWeight: "600", width: 35 },

  transactionsList: { marginHorizontal: 20, borderRadius: 24, padding: 16 },
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
  txMerchant: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  txDate: { fontSize: 12 },
  txAmount: { fontSize: 16, fontWeight: "700" },
});
