import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetOnboardingStatus } from "@workspace/api-client-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { DEV_BYPASS_AUTH } from "@/constants/devFlags";
import { useColors } from "@/hooks/useColors";

function LoadingScreen() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function HomeLayoutInner() {
  const { data: onboarding, isLoading, isError } = useGetOnboardingStatus();

  if (isLoading) return <LoadingScreen />;

  // If we can't reach the API or something went wrong, let through (graceful degradation)
  if (isError) return <Stack screenOptions={{ headerShown: false }} />;

  if (onboarding && !onboarding.completed) {
    // Step 1: haven't consented yet → start of onboarding
    if (onboarding.currentStep < 2) {
      return <Redirect href="/onboarding" />;
    }
    // Step 2: consented but haven't finished onboarding
    return <Redirect href="/onboarding/complete" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function HomeLayout() {
  usePushNotifications();

  // Dev bypass: skip Clerk entirely and go straight to the app.
  if (DEV_BYPASS_AUTH) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isSignedIn, isLoaded, getToken } = useAuth();

  // Set token getter synchronously so it's available on first API call
  // setAuthTokenGetter is idempotent — safe to call on every render
  setAuthTokenGetter(() => getToken());

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  // Don't kick users out while Clerk is still resolving the session —
  // navigating here right after sign-in finalize races auth-state propagation.
  if (!isLoaded) return <LoadingScreen />;

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return <HomeLayoutInner />;
}
