import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useUser } from "@clerk/expo";
import {
  useGetFinancialSummary,
  useGetAccounts,
} from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { toFeatherIcon } from "@/utils/iconMapping";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const { user } = useUser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: 100, // Account for tab bar
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
        <TouchableOpacity style={[styles.notificationButton, { borderColor: colors.border }]}>
          <Feather name="bell" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Total Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Total Balance</Text>
        <Text style={[styles.balanceAmount, { color: colors.text }]}>
          ${summary?.totalBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={styles.balanceChangeContainer}>
          <Feather name="trending-up" size={16} color={colors.accent} />
          <Text style={[styles.balanceChange, { color: colors.accent }]}>+2.4% vs last month</Text>
        </View>
      </View>

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

      {/* Spending Categories */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Spending</Text>
        <View style={[styles.categoriesCard, { backgroundColor: colors.card }]}>
          {summary?.topCategories?.slice(0, 4).map((cat, index) => (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceCard: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 12,
  },
  balanceChangeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceChange: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  accountsScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  accountCard: {
    width: width * 0.7,
    padding: 20,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  institution: {
    fontSize: 12,
    fontWeight: "600",
  },
  accountTypeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  accountType: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 20,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
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
  savingsRateText: {
    fontSize: 15,
    fontWeight: "500",
  },
  categoriesCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
  },
  categoryBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  categoryPercent: {
    fontSize: 12,
    fontWeight: "600",
    width: 35,
  },
  transactionsList: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 16,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txMerchant: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  txDate: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
});
