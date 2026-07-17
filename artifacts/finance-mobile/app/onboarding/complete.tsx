import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useCompleteOnboarding, getGetOnboardingStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withDelay 
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { mutate: completeOnboarding, isPending } = useCompleteOnboarding();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const scale = useSharedValue(0);
  
  useEffect(() => {
    scale.value = withDelay(300, withSpring(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleFinish = () => {
    setErrorMessage(null);
    completeOnboarding(
      undefined,
      {
        onSuccess: (data) => {
          queryClient.setQueryData(
            getGetOnboardingStatusQueryKey(),
            data ?? { completed: true, currentStep: 3, totalSteps: 3 }
          );
          router.replace("/(home)/(tabs)");
        },
        onError: () => {
          // Optimistically let the user through anyway — the home layout will
          // gracefully allow access if the status query errors on next load.
          // But first, show an error with a retry and a "skip" escape hatch so
          // the user is never silently stuck here.
          setErrorMessage(
            "We couldn't save your progress. You can try again, or go to the dashboard — your account is ready."
          );
        },
      }
    );
  };

  const handleSkipToDashboard = () => {
    // Optimistically mark onboarding complete in the cache so the home layout
    // does not redirect back to onboarding on the next render.
    queryClient.setQueryData(
      getGetOnboardingStatusQueryKey(),
      { completed: true, currentStep: 3, totalSteps: 3 }
    );
    router.replace("/(home)/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.iconContainer, animatedStyle, { backgroundColor: colors.accent + "20" }]}>
          <Feather name="check" size={48} color={colors.accent} />
        </Animated.View>
        
        <Text style={[styles.title, { color: colors.text }]}>You're all set!</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Your financial data is being analyzed. We'll have personalized insights ready for you.
        </Text>

        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
            <Feather name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {errorMessage ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.retryButton, { borderColor: colors.primary }]}
              onPress={handleFinish}
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
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipToDashboard}
              disabled={isPending}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Go to Dashboard Anyway</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              isPending && styles.buttonDisabled,
            ]}
            onPress={handleFinish}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Go to Dashboard</Text>
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
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 32,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Outfit_500Medium",
  },
  footer: {
    paddingHorizontal: 32,
    gap: 16,
  },
  button: {
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
  },
  retryButton: {
    borderWidth: 2,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
  },
  skipButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: "Outfit_500Medium",
  },
});
