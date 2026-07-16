import React from "react";
import { View, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useBoldColors } from "@/hooks/useBoldColors";
import {
  BoldButton,
  BoldText,
  BoldBadge,
} from "@/components/bold";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useBoldColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 32, paddingTop: insets.top + 60 }}>
        <Feather name="activity" size={120} color={colors.primary} style={{ marginBottom: 40 }} />
        <BoldText variant="displayMD" weight="800" color={colors.text} style={{ textAlign: "center", marginBottom: 12 }}>
          Your Financial Balance
        </BoldText>
        <BoldText variant="bodyLG" color={colors.mutedForeground} style={{ textAlign: "center", lineHeight: 26, marginBottom: 40 }}>
          AI-powered insights for smarter money decisions
        </BoldText>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
          {["Regret Score", "Rescue Plans", "Money Stories", "Digital Twin"].map((pill) => (
            <BoldBadge key={pill} variant="primary" size="lg" style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              {pill}
            </BoldBadge>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        <BoldButton variant="primary" size="xl" fullWidth onPress={() => router.push("/onboarding/consent")}>
          Get Started
        </BoldButton>
      </View>
    </View>
  );
}
