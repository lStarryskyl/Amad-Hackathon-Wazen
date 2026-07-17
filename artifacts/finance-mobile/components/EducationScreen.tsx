import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export type EducationCard = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  tone?: "primary" | "accent" | "warning";
};

type Props = {
  step: number; // 1-based
  totalSteps: number;
  heroIcon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  cards: EducationCard[];
  nextHref?: string; // omit on last screen
  footnote?: string;
};

/**
 * Shared layout for the static open-banking explainer screens.
 * Hero icon + title, a stack of icon cards, step dots, and a
 * Next / Done footer consistent with the onboarding design language.
 */
export default function EducationScreen({
  step,
  totalSteps,
  heroIcon,
  title,
  subtitle,
  cards,
  nextHref,
  footnote,
}: Props) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const toneColor = (tone?: EducationCard["tone"]) =>
    tone === "accent"
      ? colors.accent
      : tone === "warning"
        ? colors.warning
        : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Feather name={heroIcon} size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          {cards.map((card, i) => (
            <View
              key={i}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: toneColor(card.tone) + "18" },
                ]}
              >
                <Feather
                  name={card.icon}
                  size={20}
                  color={toneColor(card.tone)}
                />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {card.title}
                </Text>
                <Text
                  style={[styles.cardBody, { color: colors.textSecondary }]}
                >
                  {card.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {footnote ? (
          <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
            {footnote}
          </Text>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === step - 1 ? colors.primary : colors.border,
                  width: i === step - 1 ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>
        {nextHref ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push(nextHref as any)}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.buttonText, { color: colors.primaryForeground }]}
            >
              Next
            </Text>
            <Feather
              name="arrow-right"
              size={18}
              color={colors.primaryForeground}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Feather
              name="check"
              size={18}
              color={colors.primaryForeground}
            />
            <Text
              style={[styles.buttonText, { color: colors.primaryForeground }]}
            >
              Got It
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 4,
  },
  header: { alignItems: "center", marginBottom: 28 },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  cards: { gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  button: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
