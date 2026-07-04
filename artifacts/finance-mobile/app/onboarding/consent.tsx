import React, { useState } from "react";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConsent = () => {
    setErrorMessage(null);
    acceptConsent(
      undefined,
      {
        onSuccess: () => {
          router.replace("/onboarding/complete");
        },
        onError: () => {
          setErrorMessage(
            "Something went wrong saving your consent. Please check your connection and try again."
          );
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

        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
            <Feather name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {errorMessage ? (
          <TouchableOpacity
            style={[styles.button, styles.retryButton, { borderColor: colors.primary }]}
            onPress={handleConsent}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="refresh-cw" size={18} color={colors.primary} style={styles.retryIcon} />
                <Text style={[styles.retryButtonText, { color: colors.primary }]}>Try Again</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
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
        )}
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
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 24,
  },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  retryButton: {
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
