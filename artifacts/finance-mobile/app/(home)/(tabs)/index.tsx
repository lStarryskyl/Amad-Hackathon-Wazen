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
} from "react-native";
import { useUser } from "@clerk/expo";
import { getDisplayName } from "@/utils/displayName";
import {
  useGetFinancialSummary,
  useGetAccounts,
  useGetTodayCheckin,
  useSubmitCheckin,
  useGetAlerts,
  useMarkAlertRead,
  useMarkAllAlertsRead,
  useGetTransactions,
  getGetTransactionsQueryKey,
} from "@workspace/api-client-react";
import type { Transaction } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { toFeatherIcon } from "@/utils/iconMapping";
import RegretMeterWidget from "@/components/RegretMeterWidget";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { useQueryClient } from "@tanstack/react-query";
import { Radius } from "@/constants/colors";
import {
  Card,
  Chip,
  EmptyState,
  FadeInView,
  GradientCard,
  IconBadge,
  PrimaryButton,
  ProgressBar,
  SectionHeader,
  Skeleton,
  haptic,
} from "@/components/ui";

const { width } = Dimensions.get("window");

// ─── Daily Check-in Card ──────────────────────────────────────────────────────

function DailyCheckinCard() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: todayData, isLoading } = useGetTodayCheckin({ staleTime: 5 * 60 * 1000, retry: 1 });
  const { mutate: submitCheckin, isPending } = useSubmitCheckin({
    onSuccess: (result) => {
      haptic("success");
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
      <Card
        variant="elevated"
        style={[
          styles.checkinCard,
          !alreadyDone && { borderColor: colors.primary + "45", backgroundColor: colors.primary + "0E" },
        ]}
      >
        <View style={styles.checkinLeft}>
          <Text style={{ fontSize: 26 }}>{alreadyDone ? (checkin?.moodEmoji ?? "✅") : "☀️"}</Text>
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
          <View style={[styles.healthScoreBadge, { backgroundColor: healthColor + "18" }]}>
            <Text style={[styles.healthScoreNum, { color: healthColor }]}>{checkin?.healthScore}</Text>
            <Text style={[styles.healthScoreLabel, { color: healthColor }]}>Health</Text>
          </View>
        ) : (
          <PrimaryButton
            label="Check In"
            small
            loading={isPending}
            onPress={() => submitCheckin()}
            hapticKind="medium"
          />
        )}
      </Card>

      <Modal visible={showAchModal} transparent animationType="fade" onRequestClose={() => setShowAchModal(false)}>
        <TouchableOpacity style={styles.achModalOverlay} activeOpacity={1} onPress={() => setShowAchModal(false)}>
          <View style={[styles.achModalCard, { backgroundColor: colors.card }]}>
            <Text style={styles.achModalEmoji}>{newAchievement?.icon ?? "🏆"}</Text>
            <Text style={[styles.achModalTitle, { color: colors.mutedForeground }]}>Achievement Unlocked!</Text>
            <Text style={[styles.achModalName, { color: colors.primary }]}>{newAchievement?.title}</Text>
            <Text style={[styles.achModalDesc, { color: colors.mutedForeground }]}>{newAchievement?.description}</Text>
            <PrimaryButton
              label="Awesome! 🎉"
              onPress={() => setShowAchModal(false)}
              style={{ alignSelf: "stretch" }}
              hapticKind="success"
            />
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
                <TouchableOpacity onPress={() => { haptic("light"); markAllRead(); }} style={[styles.markAllBtn, { borderColor: colors.border }]}>
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
              <IconBadge icon="bell-off" color={colors.mutedForeground} size={56} />
              <Text style={[styles.alertsEmptyText, { color: colors.mutedForeground }]}>No notifications yet</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {data?.alerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.alertRow,
                  { borderBottomColor: colors.border, backgroundColor: alert.isRead ? "transparent" : colors.primary + "0A" },
                ]}
                onPress={() => !alert.isRead && markRead(alert.id)}
                activeOpacity={0.7}
              >
                <IconBadge icon={alertTypeIcon(alert.type) as any} color={alertTypeColor(alert.type)} size={40} />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: colors.text, fontFamily: alert.isRead ? "Outfit_500Medium" : "Outfit_700Bold" }]}>
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

// ─── Quick actions row ────────────────────────────────────────────────────────

function QuickActions() {
  const colors = useColors();
  const router = useRouter();

  const ACTIONS: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; color: string; onPress: () => void }[] = [
    {
      icon: "zap",
      label: "Simulate",
      color: colors.primary,
      onPress: () => router.push("/(home)/(tabs)/simulate" as any),
    },
    {
      icon: "target",
      label: "Goals",
      color: colors.accent,
      onPress: () => router.push("/(home)/(tabs)/progress" as any),
    },
    {
      icon: "activity",
      label: "Insights",
      color: colors.warning,
      onPress: () => router.push("/(home)/(tabs)/insights" as any),
    },
    {
      icon: "shield",
      label: "Privacy",
      color: colors.danger,
      onPress: () => router.push("/open-banking" as any),
    },
  ];

  return (
    <View style={styles.quickRow}>
      {ACTIONS.map((a) => (
        <TouchableOpacity
          key={a.label}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { haptic("light"); a.onPress(); }}
          activeOpacity={0.75}
        >
          <IconBadge icon={a.icon} color={a.color} size={38} />
          <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Transaction row (shared between recent list + full history) ─────────────

function TransactionRow({ tx }: {
  tx: Pick<Transaction, "merchantName" | "description" | "date" | "amount" | "type"> & {
    categoryColor?: string | null;
    categoryIcon?: string | null;
  };
}) {
  const colors = useColors();
  const isDebit = tx.type === "debit";
  return (
    <View style={styles.transactionItem}>
      <View style={styles.txLeft}>
        <IconBadge
          icon={toFeatherIcon(tx.categoryIcon)}
          color={tx.categoryColor || colors.mutedForeground}
          size={40}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.txMerchant, { color: colors.text }]} numberOfLines={1}>
            {tx.merchantName || tx.description}
          </Text>
          <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
            {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </Text>
        </View>
      </View>
      <Text style={[styles.txAmount, { color: isDebit ? colors.text : colors.accent }]}>
        {isDebit ? "-" : "+"}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

// ─── Full transaction history modal ──────────────────────────────────────────

function TransactionsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [filter, setFilter] = useState<"all" | "debit" | "credit">("all");
  const txParams = { limit: 100 };
  const { data, isLoading } = useGetTransactions(txParams, {
    query: { queryKey: getGetTransactionsQueryKey(txParams), enabled: visible, staleTime: 60_000 },
  });

  const items = (data?.items ?? []).filter((tx) => filter === "all" || tx.type === filter);

  const FILTERS: { key: "all" | "debit" | "credit"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "debit", label: "Money Out" },
    { key: "credit", label: "Money In" },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.alertsOverlay}>
        <View style={[styles.alertsPanel, { backgroundColor: colors.background }]}>
          <View style={[styles.alertsHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.alertsTitle, { color: colors.text }]}>Transactions</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.cardElevated }]}>
              <Feather name="x" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => { haptic("light"); setFilter(f.key); }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: active ? colors.primaryForeground : colors.textSecondary }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isLoading ? (
            <View style={styles.alertsLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.alertsEmpty}>
              <IconBadge icon="inbox" color={colors.mutedForeground} size={56} />
              <Text style={[styles.alertsEmptyText, { color: colors.mutedForeground }]}>No transactions found</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              {items.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function HomeSkeleton() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 28 }}>
        <View>
          <Skeleton width={110} height={14} style={{ marginBottom: 10 }} />
          <Skeleton width={180} height={28} />
        </View>
        <Skeleton width={46} height={46} radius={23} />
      </View>
      <Skeleton width={"100%" as const} height={180} radius={Radius.xl} style={{ marginBottom: 20 }} />
      <Skeleton width={"100%" as const} height={90} radius={Radius.xl} style={{ marginBottom: 20 }} />
      <Skeleton width={"60%" as const} height={20} style={{ marginBottom: 14 }} />
      <View style={{ flexDirection: "row", gap: 14 }}>
        <Skeleton width={width * 0.6} height={130} radius={Radius.xl} />
        <Skeleton width={width * 0.3} height={130} radius={Radius.xl} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user } = useUser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useGetFinancialSummary();

  const {
    data: accounts,
    isLoading: accountsLoading,
    isError: accountsError,
    refetch: refetchAccounts,
  } = useGetAccounts();

  const { data: alertsData } = useGetAlerts({ staleTime: 30_000 });
  const unreadCount = alertsData?.unreadCount ?? 0;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSummary(), refetchAccounts()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchSummary, refetchAccounts]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const masked = "••••••";
  const balanceText = hideBalance
    ? masked
    : `$${summary?.totalBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}`;

  if ((summaryLoading && !summaryError) || (accountsLoading && !accountsError)) {
    return <HomeSkeleton />;
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting},</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{getDisplayName(user)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { haptic("light"); setShowAlerts(true); }}
          >
            <Feather name="bell" size={19} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <PwaInstallBanner />

        {/* ── Balance hero ── */}
        <FadeInView style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <GradientCard>
            <View style={styles.heroTopRow}>
              <Text style={[styles.balanceLabel, { color: colors.onGradientMuted }]}>Total Balance</Text>
              <TouchableOpacity
                onPress={() => { haptic("light"); setHideBalance(!hideBalance); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name={hideBalance ? "eye" : "eye-off"} size={17} color={colors.onGradientMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.balanceAmount, { color: colors.onGradient }]}>{balanceText}</Text>

            {summary && summary.savingsRate !== undefined && (
              <View style={styles.balanceChangeContainer}>
                <Feather
                  name={summary.savingsRate >= 0 ? "trending-up" : "trending-down"}
                  size={15}
                  color={colors.onGradient}
                />
                <Text style={[styles.balanceChange, { color: colors.onGradient }]}>
                  {summary.savingsRate >= 0 ? "+" : ""}{summary.savingsRate.toFixed(1)}% savings rate this month
                </Text>
              </View>
            )}

            <View style={[styles.heroDivider, { backgroundColor: "rgba(255,255,255,0.18)" }]} />

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <View style={styles.heroStatLabelRow}>
                  <Feather name="arrow-down-left" size={13} color={colors.onGradientMuted} />
                  <Text style={[styles.heroStatLabel, { color: colors.onGradientMuted }]}>Income</Text>
                </View>
                <Text style={[styles.heroStatValue, { color: colors.onGradient }]}>
                  {hideBalance ? masked : `+$${summary?.totalIncome?.toLocaleString() ?? "0"}`}
                </Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
              <View style={styles.heroStat}>
                <View style={styles.heroStatLabelRow}>
                  <Feather name="arrow-up-right" size={13} color={colors.onGradientMuted} />
                  <Text style={[styles.heroStatLabel, { color: colors.onGradientMuted }]}>Expenses</Text>
                </View>
                <Text style={[styles.heroStatValue, { color: colors.onGradient }]}>
                  {hideBalance ? masked : `-$${summary?.totalExpenses?.toLocaleString() ?? "0"}`}
                </Text>
              </View>
            </View>
          </GradientCard>
        </FadeInView>

        {/* ── Quick actions ── */}
        <FadeInView delay={40} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <QuickActions />
        </FadeInView>

        {/* ── Daily Check-in ── */}
        <FadeInView delay={60} style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <DailyCheckinCard />
        </FadeInView>

        {/* ── Regret Meter ── */}
        <FadeInView delay={120}>
          <RegretMeterWidget />
        </FadeInView>

        {/* ── Accounts ── */}
        <FadeInView delay={160} style={styles.section}>
          <SectionHeader title="Your Accounts" style={{ paddingHorizontal: 20 }} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsScroll}
          >
            {accounts?.map((account) => (
              <Card key={account.id} variant="elevated" style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <Text style={[styles.institution, { color: colors.mutedForeground }]}>{account.institutionName}</Text>
                  <Chip label={account.accountType} color={colors.primary} />
                </View>
                <Text style={[styles.accountName, { color: colors.textSecondary }]}>{account.accountName}</Text>
                <Text style={[styles.accountBalance, { color: colors.text }]}>
                  {hideBalance
                    ? masked
                    : `$${parseFloat(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </FadeInView>

        {/* ── Top Spending ── */}
        <FadeInView delay={200} style={styles.section}>
          <SectionHeader title="Top Spending" subtitle="This month by category" style={{ paddingHorizontal: 20 }} />
          <Card variant="elevated" style={{ marginHorizontal: 20 }}>
            {(!summary?.topCategories || summary.topCategories.length === 0) && (
              <EmptyState
                icon="pie-chart"
                title="Nothing to show yet"
                description="Your category breakdown appears once you have spending this month."
              />
            )}
            {summary?.topCategories?.slice(0, 4).map((cat, i) => (
              <View key={cat.categoryId} style={[styles.categoryRow, i > 0 && { marginTop: 18 }]}>
                <View style={styles.categoryInfo}>
                  <IconBadge icon={toFeatherIcon(cat.categoryIcon)} color={cat.categoryColor} size={32} />
                  <Text style={[styles.categoryName, { color: colors.text }]}>{cat.categoryName}</Text>
                  <Text style={[styles.categoryPercent, { color: colors.mutedForeground }]}>{cat.percentage}%</Text>
                </View>
                <ProgressBar progress={cat.percentage / 100} color={cat.categoryColor} height={7} />
              </View>
            ))}
          </Card>
        </FadeInView>

        {/* ── Recent Transactions ── */}
        <FadeInView delay={240} style={styles.section}>
          <SectionHeader
            title="Recent Transactions"
            actionLabel="See All"
            onAction={() => setShowAllTx(true)}
            style={{ paddingHorizontal: 20 }}
          />
          <Card variant="elevated" style={{ marginHorizontal: 20, paddingVertical: 8 }}>
            {(!summary?.recentTransactions || summary.recentTransactions.length === 0) && (
              <EmptyState
                icon="credit-card"
                title="No transactions yet"
                description="Your latest activity will show up here."
                style={{ marginVertical: 12 }}
              />
            )}
            {summary?.recentTransactions?.slice(0, 5).map((tx) => (
              <TransactionRow key={tx.id} tx={tx as any} />
            ))}
          </Card>
        </FadeInView>
      </ScrollView>

      <AlertsPanel visible={showAlerts} onClose={() => setShowAlerts(false)} />
      <TransactionsModal visible={showAllTx} onClose={() => setShowAllTx(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: { fontSize: 15, fontFamily: "Outfit_400Regular", marginBottom: 2 },
  userName: { fontSize: 28, fontFamily: "Outfit_700Bold", letterSpacing: -0.6 },
  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Outfit_700Bold" },

  // Hero
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  balanceLabel: { fontSize: 13, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase", letterSpacing: 1 },
  balanceAmount: { fontSize: 40, fontFamily: "Lora_700Bold", letterSpacing: -1, marginBottom: 10 },
  balanceChangeContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  balanceChange: { fontSize: 13.5, fontFamily: "Outfit_600SemiBold" },
  heroDivider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  heroStatsRow: { flexDirection: "row", alignItems: "center" },
  heroStat: { flex: 1 },
  heroStatLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  heroStatLabel: { fontSize: 12, fontFamily: "Outfit_500Medium" },
  heroStatValue: { fontSize: 19, fontFamily: "Outfit_700Bold" },
  heroStatDivider: { width: StyleSheet.hairlineWidth, height: 36, marginHorizontal: 16 },

  // Check-in
  checkinCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  checkinLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  checkinTitle: { fontSize: 15.5, fontFamily: "Outfit_600SemiBold", marginBottom: 3 },
  checkinSummary: { fontSize: 12.5, lineHeight: 17, fontFamily: "Outfit_400Regular" },
  healthScoreBadge: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: Radius.md, alignItems: "center", minWidth: 60 },
  healthScoreNum: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  healthScoreLabel: { fontSize: 10, fontFamily: "Outfit_600SemiBold", marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5 },

  achModalOverlay: { flex: 1, backgroundColor: "rgba(8,9,20,0.72)", justifyContent: "center", alignItems: "center", padding: 24 },
  achModalCard: { borderRadius: Radius.xl, padding: 30, alignItems: "center", width: "100%", maxWidth: 340, ...shadow({ offsetY: 10, opacity: 0.15, radius: 24 }) },
  achModalEmoji: { fontSize: 60, marginBottom: 14 },
  achModalTitle: { fontSize: 13, fontFamily: "Outfit_600SemiBold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  achModalName: { fontSize: 26, fontFamily: "Lora_700Bold", marginBottom: 10, textAlign: "center" },
  achModalDesc: { fontSize: 15, fontFamily: "Outfit_400Regular", lineHeight: 22, textAlign: "center", marginBottom: 26 },

  alertsOverlay: { flex: 1, backgroundColor: "rgba(8,9,20,0.55)", justifyContent: "flex-end" },
  alertsPanel: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%", minHeight: "55%" },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  alertsTitle: { fontSize: 21, fontFamily: "Outfit_700Bold", letterSpacing: -0.3 },
  alertsHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  markAllBtn: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1 },
  markAllText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  closeBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  alertsLoading: { padding: 40, alignItems: "center" },
  alertsEmpty: { padding: 60, alignItems: "center", gap: 16 },
  alertsEmptyText: { fontSize: 15, fontFamily: "Outfit_400Regular" },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 15, marginBottom: 3 },
  alertMessage: { fontSize: 13.5, lineHeight: 19, marginBottom: 5, fontFamily: "Outfit_400Regular" },
  alertTime: { fontSize: 11.5, fontFamily: "Outfit_400Regular" },
  unreadDot: { width: 9, height: 9, borderRadius: 5, marginTop: 8 },

  quickRow: { flexDirection: "row", gap: 10 },
  quickTile: {
    flex: 1,
    alignItems: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  quickLabel: { fontSize: 11.5, fontFamily: "Outfit_600SemiBold" },

  filterRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },

  section: { marginBottom: 26 },
  accountsScroll: { paddingLeft: 20, paddingRight: 8 },
  accountCard: { width: width * 0.68, marginRight: 14 },
  accountHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  institution: { fontSize: 12, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6, flex: 1, marginRight: 8 },
  accountName: { fontSize: 15, fontFamily: "Outfit_500Medium", marginBottom: 6 },
  accountBalance: { fontSize: 23, fontFamily: "Lora_700Bold", letterSpacing: -0.5 },

  categoryRow: {},
  categoryInfo: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  categoryName: { fontSize: 14.5, fontFamily: "Outfit_600SemiBold", flex: 1 },
  categoryPercent: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },

  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  txLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 12 },
  txMerchant: { fontSize: 15, fontFamily: "Outfit_600SemiBold", marginBottom: 2 },
  txDate: { fontSize: 12.5, fontFamily: "Outfit_400Regular" },
  txAmount: { fontSize: 15.5, fontFamily: "Outfit_700Bold" },
});
