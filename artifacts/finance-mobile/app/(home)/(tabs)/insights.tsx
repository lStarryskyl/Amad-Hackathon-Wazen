import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 24 }}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="activity" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Behavioral Insights</Text>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        AI-powered analysis of your spending patterns, emotional triggers, and financial habits — coming soon.
      </Text>

      <View style={styles.previewContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.previewLine, { width: "60%", backgroundColor: colors.border }]} />
            <View style={[styles.previewLine, { width: "80%", backgroundColor: colors.border }]} />
            <View style={[styles.previewLine, { width: "40%", backgroundColor: colors.border }]} />
          </View>
        ))}
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
    height: 100,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    opacity: 0.5,
  },
  previewLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
});
