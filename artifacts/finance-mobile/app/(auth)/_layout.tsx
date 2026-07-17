import { Redirect, Stack } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { DEV_BYPASS_AUTH } from "@/constants/devFlags";

export default function AuthLayout() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();

  // Bypass mode: nobody should land here, but if they do redirect to home.
  if (DEV_BYPASS_AUTH) {
    return <Redirect href="/(home)/(tabs)" />;
  }

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (isSignedIn) {
    return <Redirect href="/(home)/(tabs)" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </View>
  );
}
