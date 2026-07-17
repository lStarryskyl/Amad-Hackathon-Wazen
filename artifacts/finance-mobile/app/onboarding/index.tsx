import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={[styles.title, { color: colors.text }]}>
          Know Your Money.
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          AI-powered financial balance, built around your real habits.
        </Text>

        <View style={styles.pillsContainer}>
          {["Regret Meter", "Rescue Plans", "Money Stories"].map((pill) => (
            <View 
              key={pill} 
              style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>{pill}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/onboarding/consent")}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 40,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 48,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
  },
  footer: {
    paddingHorizontal: 32,
  },
  button: {
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
  },
});
