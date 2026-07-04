import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  
  const scale = useSharedValue(0);
  
  useEffect(() => {
    scale.value = withDelay(300, withSpring(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleFinish = () => {
    completeOnboarding(
      undefined,
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetOnboardingStatusQueryKey(), data ?? { completed: true, currentStep: 3, totalSteps: 3 });
          router.replace("/(home)/(tabs)");
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, animatedStyle, { backgroundColor: colors.accent + "20" }]}>
          <Feather name="check" size={48} color={colors.accent} />
        </Animated.View>
        
        <Text style={[styles.title, { color: colors.text }]}>You're all set!</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Your financial data is being analyzed. We'll have personalized insights ready for you.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
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
    justifyContent: "center",
    paddingHorizontal: 32,
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
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
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
