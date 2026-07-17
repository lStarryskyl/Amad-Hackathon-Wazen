import React, { useMemo, useState } from "react";
import { shadow } from "@/utils/shadow";
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
  greeting: { fontSize: 18, fontFamily: "Lora_400Regular_Italic", marginBottom: 2 },
  userName: { fontSize: 32, fontFamily: "Outfit_700Bold", letterSpacing: -0.5 },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Outfit_700Bold" },

  checkinCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderWidth: 1,
    ...shadow({ opacity: 0.03, radius: 16, elevation: 2 }),
  },
  checkinLeft: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  checkinTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold", marginBottom: 4 },
  checkinSummary: { fontSize: 13, lineHeight: 18, fontFamily: "Outfit_400Regular" },
  checkinBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 88,
    alignItems: "center",
  },
  checkinBtnText: { color: "#fff", fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  healthScoreBadge: { padding: 12, borderRadius: 16, alignItems: "center", minWidth: 64 },
  healthScoreNum: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  healthScoreLabel: { fontSize: 11, fontFamily: "Outfit_600SemiBold", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },

  achModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  achModalCard: { borderRadius: 32, padding: 32, alignItems: "center", width: "100%", maxWidth: 340, ...shadow({ offsetY: 10, opacity: 0.1, radius: 20 }) },
  achModalEmoji: { fontSize: 64, marginBottom: 16 },
  achModalTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold", marginBottom: 6, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 },
  achModalName: { fontSize: 28, fontFamily: "Lora_700Bold", marginBottom: 12, textAlign: "center" },
  achModalDesc: { fontSize: 16, fontFamily: "Outfit_400Regular", lineHeight: 24, textAlign: "center", marginBottom: 32 },
  achModalClose: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 24, width: "100%", alignItems: "center" },
  achModalCloseText: { color: "#fff", fontSize: 16, fontFamily: "Outfit_600SemiBold" },

  alertsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  alertsPanel: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: "85%", minHeight: "50%" },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  alertsTitle: { fontSize: 22, fontFamily: "Lora_700Bold" },
  alertsHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  markAllBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  markAllText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  alertsLoading: { padding: 40, alignItems: "center" },
  alertsEmpty: { padding: 60, alignItems: "center", gap: 16 },
  alertsEmptyText: { fontSize: 16, fontFamily: "Outfit_400Regular" },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  alertIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 15, marginBottom: 4, fontFamily: "Outfit_500Medium" },
  alertMessage: { fontSize: 14, lineHeight: 20, marginBottom: 6, fontFamily: "Outfit_400Regular" },
  alertTime: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },

  balanceCard: { marginHorizontal: 20, padding: 28, borderRadius: 32, marginBottom: 28, ...shadow({ opacity: 0.03, radius: 16, elevation: 2 }) },
  balanceLabel: { fontSize: 14, fontFamily: "Outfit_500Medium", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  balanceAmount: { fontSize: 44, fontFamily: "Lora_700Bold", marginBottom: 16, letterSpacing: -1 },
  balanceChangeContainer: { flexDirection: "row", alignItems: "center" },
  balanceChange: { fontSize: 15, fontFamily: "Outfit_600SemiBold", marginLeft: 6 },

  section: { marginBottom: 32 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 20, fontFamily: "Lora_700Bold", paddingHorizontal: 20, marginBottom: 20 },
  accountsScroll: { paddingLeft: 20, paddingRight: 10 },
  accountCard: { width: width * 0.75, padding: 24, borderRadius: 24, marginRight: 16, borderWidth: 1 },
  accountHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  institution: { fontSize: 13, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  accountTypeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  accountType: { fontSize: 11, fontFamily: "Outfit_700Bold", textTransform: "uppercase" },
  accountName: { fontSize: 18, fontFamily: "Outfit_500Medium", marginBottom: 8 },
  accountBalance: { fontSize: 24, fontFamily: "Lora_700Bold" },

  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 16, marginBottom: 16 },
  summaryCard: { flex: 1, padding: 20, borderRadius: 24 },
  summaryLabel: { fontSize: 13, fontFamily: "Outfit_500Medium", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontFamily: "Outfit_700Bold" },

  savingsRateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 28,
    gap: 16,
  },
  savingsRateText: { fontSize: 16, fontFamily: "Outfit_500Medium" },

  regretTeaser: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 32,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  regretTeaserLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
  regretTeaserTitle: { fontSize: 15, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  regretTeaserLevel: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },

  categoriesCard: { marginHorizontal: 20, padding: 24, borderRadius: 28, ...shadow({ opacity: 0.03, radius: 16, elevation: 2 }) },
  categoryRow: { marginBottom: 20 },
  categoryInfo: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 12 },
  categoryName: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  categoryBarContainer: { flexDirection: "row", alignItems: "center", gap: 16 },
  categoryBar: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  categoryBarFill: { height: "100%", borderRadius: 4 },
  categoryPercent: { fontSize: 13, fontFamily: "Outfit_600SemiBold", width: 40 },

  transactionsList: { marginHorizontal: 20, borderRadius: 28, padding: 20, ...shadow({ opacity: 0.03, radius: 16, elevation: 2 }) },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  txLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 16 },
  txMerchant: { fontSize: 16, fontFamily: "Outfit_600SemiBold", marginBottom: 4 },
  txDate: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  txAmount: { fontSize: 17, fontFamily: "Outfit_700Bold" },
});
