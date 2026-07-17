import { Redirect } from "expo-router";
import { DEV_BYPASS_AUTH } from "@/constants/devFlags";
import { useAuth } from "@clerk/expo";
import { View, ActivityIndicator } from "react-native";

export default function RootIndex() {
  if (DEV_BYPASS_AUTH) {
    return <Redirect href="/(home)/(tabs)" />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(home)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
