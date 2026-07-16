import React, { useEffect, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useCompleteOnboarding, getGetOnboardingStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { useBoldColors } from "@/hooks/useBoldColors";
import {
  BoldButton,
  BoldText,
} from "@/components/bold";

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const colors = useBoldColors();
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
          setErrorMessage(
            "We couldn't save your progress. You can try again, or go to the dashboard — your account is ready."
          );
        },
      }
    );
  };

  const handleSkipToDashboard = () => {
    queryClient.setQueryData(
      getGetOnboardingStatusQueryKey(),
      { completed: true, currentStep: 3, totalSteps: 3 }
    );
    router.replace("/(home)/(tabs)");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Animated.View
          style={[
            { width: 96, height: 96, borderRadius: 48, justifyContent: "center", alignItems: "center", backgroundColor: colors.success + "20", marginBottom: 32 },
            animatedStyle,
          ]}
        >
          <Feather name="check" size={48} color={colors.success} />
        </Animated.View>

        <BoldText variant="displayMD" weight="700" color={colors.text} style={{ textAlign: "center", marginBottom: 16 }}>
          You're all set!
        </BoldText>
        <BoldText variant="bodyMD" color={colors.textSecondary} style={{ textAlign: "center", lineHeight: 24 }}>
          Your financial data is being analyzed. We'll have personalized insights ready for you.
        </BoldText>

        {errorMessage ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 24, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.danger + "40", backgroundColor: colors.danger + "18", alignSelf: "stretch" }}>
            <Feather name="alert-circle" size={18} color={colors.danger} />
            <BoldText variant="bodySM" color={colors.danger} style={{ flex: 1, lineHeight: 20 }}>{errorMessage}</BoldText>
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, gap: 12 }}>
        {errorMessage ? (
          <>
            <BoldButton variant="outline" size="xl" fullWidth onPress={handleFinish} disabled={isPending} loading={isPending} leftIcon={<Feather name="refresh-cw" size={18} color={colors.primary} />}>
              Try Again
            </BoldButton>
            <TouchableOpacity style={{ height: 44, justifyContent: "center", alignItems: "center" }} onPress={handleSkipToDashboard} disabled={isPending}>
              <BoldText variant="bodyMD" weight="500" color={colors.textSecondary}>
                Go to Dashboard Anyway
              </BoldText>
            </TouchableOpacity>
          </>
        ) : (
          <BoldButton variant="primary" size="xl" fullWidth onPress={handleFinish} disabled={isPending} loading={isPending}>
            Go to Dashboard
          </BoldButton>
        )}
      </View>
    </View>
  );
}
