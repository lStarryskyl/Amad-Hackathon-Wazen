import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function RootIndex() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A0E1A" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(home)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
