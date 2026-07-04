import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAcceptConsent } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function ConsentScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { mutate: acceptConsent, isPending } = useAcceptConsent();

  const handleConsent = () => {
    acceptConsent(
      undefined,
      {
        onSuccess: () => {
          router.replace("/onboarding/complete");
        },
      }
    );
  };

  const bullets = [
    "Demo financial data used to show features",
    "Encrypted data storage on secure servers",
    "Personalized behavioral analysis by AI",
    "No data sold to third parties — ever",
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: 40 },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="shield" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Your Privacy, Protected</Text>
        </View>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          This app uses your financial data only to help you. Your data is never sold. 
          AI analysis happens on secure servers. You can delete everything at any time.
        </Text>

        <View style={styles.bulletsContainer}>
          {bullets.map((bullet, index) => (
            <View key={index} style={styles.bulletRow}>
              <Feather name="check" size={20} color={colors.accent} />
              <Text style={[styles.bulletText, { color: colors.text }]}>{bullet}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.linkButton}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Learn More</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            isPending && styles.buttonDisabled,
          ]}
          onPress={handleConsent}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>I Understand & Consent</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 32,
  },
  bulletsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  bulletText: {
    fontSize: 16,
    fontWeight: "500",
  },
  linkButton: {
    alignItems: "center",
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  footer: {
    paddingHorizontal: 24,
  },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
