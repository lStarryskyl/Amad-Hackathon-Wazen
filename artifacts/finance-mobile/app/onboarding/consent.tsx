import React, { useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAcceptConsent } from "@workspace/api-client-react";
import { useBoldColors } from "@/hooks/useBoldColors";
import {
  BoldButton,
  BoldCard,
  BoldText,
} from "@/components/bold";

export default function ConsentScreen() {
  const router = useRouter();
  const colors = useBoldColors();
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 40, paddingBottom: 40 }}
      >
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", backgroundColor: colors.primary + "20", marginBottom: 20 }}>
            <Feather name="shield" size={40} color={colors.primary} />
          </View>
          <BoldText variant="displayMD" weight="700" color={colors.text} style={{ textAlign: "center" }}>
            Your Privacy, Protected
          </BoldText>
        </View>

        <BoldText variant="bodyMD" color={colors.textSecondary} style={{ textAlign: "center", lineHeight: 24, marginBottom: 32 }}>
          This app uses your financial data only to help you. Your data is never sold.
          AI analysis happens on secure servers. You can delete everything at any time.
        </BoldText>

        <View style={{ gap: 16, marginBottom: 32 }}>
          {bullets.map((bullet, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12 }}>
              <Feather name="check" size={20} color={colors.success} />
              <BoldText variant="bodyMD" weight="500" color={colors.text}>{bullet}</BoldText>
            </View>
          ))}
        </View>

        <BoldButton variant="ghost" size="lg" fullWidth>
          Learn More
        </BoldButton>

        {errorMessage ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 24, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.danger + "40", backgroundColor: colors.danger + "18" }}>
            <Feather name="alert-circle" size={18} color={colors.danger} />
            <BoldText variant="bodySM" color={colors.danger} style={{ flex: 1, lineHeight: 20 }}>{errorMessage}</BoldText>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        {errorMessage ? (
          <BoldButton variant="outline" size="xl" fullWidth onPress={handleConsent} disabled={isPending} loading={isPending} leftIcon={<Feather name="refresh-cw" size={18} color={colors.primary} />}>
            Try Again
          </BoldButton>
        ) : (
          <BoldButton variant="primary" size="xl" fullWidth onPress={handleConsent} disabled={isPending} loading={isPending}>
            I Understand & Consent
          </BoldButton>
        )}
      </View>
    </View>
  );
}
