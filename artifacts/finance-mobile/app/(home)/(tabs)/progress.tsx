import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useGetGoals } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: goals, isLoading } = useGetGoals();

  const activeGoals = goals?.filter((g) => g.status === "active") || [];
  const completedGoals = goals?.filter((g) => g.status === "completed") || [];
  
  const totalSaved = goals?.reduce((acc, g) => acc + parseFloat(g.currentAmount), 0) || 0;
  const avgCompletion = goals && goals.length > 0 
    ? goals.reduce((acc, g) => acc + g.progressPercent, 0) / goals.length 
    : 0;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderGoal = ({ item }: { item: any }) => (
    <View style={[styles.goalCard, { backgroundColor: colors.card }]}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleContainer}>
          <View style={[styles.goalIcon, { backgroundColor: colors.primary + "20" }]}>
            <Feather name={item.category === 'Savings' ? 'briefcase' : 'home'} size={16} color={colors.primary} />
          </View>
          <Text style={[styles.goalName, { color: colors.text }]}>{item.name}</Text>
        </View>
        <View style={[styles.percentBadge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.percentText, { color: colors.primary }]}>{item.progressPercent}%</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: item.status === 'completed' ? colors.accent : colors.primary,
                width: `${item.progressPercent}%` 
              }
            ]} 
          />
        </View>
        <View style={styles.amountRow}>
          <Text style={[styles.amountText, { color: colors.textSecondary }]}>
            ${parseFloat(item.currentAmount).toLocaleString()} saved
          </Text>
          <Text style={[styles.amountText, { color: colors.mutedForeground }]}>
            of ${parseFloat(item.targetAmount).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.goalFooter}>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'active' ? colors.primary + "10" : colors.accent + "10" 
        }]}>
          <Text style={[styles.statusText, { 
            color: item.status === 'active' ? colors.primary : colors.accent 
          }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        {item.targetDate && (
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            by {new Date(item.targetDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={activeGoals}
        renderItem={renderGoal}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 20 }]}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Your Goals</Text>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={24} color="#FFFFFF" />
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
          </>
        }
        ListFooterComponent={
          completedGoals.length > 0 ? (
            <View style={styles.completedSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Completed Goals</Text>
              {completedGoals.map(goal => renderGoal({ item: goal }))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="target" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No goals yet. Tap + to create your first goal.
            </Text>
          </View>
        }
      />
    </View>
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  statsBar: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  goalCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  goalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  goalName: {
    fontSize: 18,
    fontWeight: "600",
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  amountRow: {
    flexDirection: "row",
    gap: 4,
  },
  amountText: {
    fontSize: 14,
  },
  goalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 12,
  },
  completedSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    maxWidth: 200,
  },
});
