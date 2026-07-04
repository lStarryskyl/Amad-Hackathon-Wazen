import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function SimulateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 24 }}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="layers" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Digital Twin Lab</Text>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        Simulate financial decisions before making them. See the 5-year impact of any choice — coming soon.
      </Text>

      <View style={styles.previewContainer}>
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>What if I quit my job?</Text>
          <View style={[styles.previewGraph, { backgroundColor: colors.border }]} />
        </View>
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>What if I buy a house?</Text>
          <View style={[styles.previewGraph, { backgroundColor: colors.border }]} />
        </View>
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>What if I invest $500/mo?</Text>
          <View style={[styles.previewGraph, { backgroundColor: colors.border }]} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  previewContainer: {
    gap: 16,
  },
  previewCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    opacity: 0.5,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  previewGraph: {
    height: 40,
    borderRadius: 10,
  },
});
