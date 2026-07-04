import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetOnboardingStatus } from "@workspace/api-client-react";

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A0E1A" }}>
      <ActivityIndicator size="large" color="#3B82F6" />
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
  const { isSignedIn, getToken } = useAuth();

  // Set token getter synchronously so it's available on first API call
  // setAuthTokenGetter is idempotent — safe to call on every render
  setAuthTokenGetter(() => getToken());

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return <HomeLayoutInner />;
}
