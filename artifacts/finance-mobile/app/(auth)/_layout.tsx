import { Redirect, Stack } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";

export default function AuthLayout() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  // Already signed in (e.g. session activated during sign-in finalize, or a
  // signed-in user deep-linked here) → forward to the app. (home)/_layout
  // takes over onboarding routing from there.
  if (isSignedIn) {
    return <Redirect href="/(home)/(tabs)" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </View>
  );
}
