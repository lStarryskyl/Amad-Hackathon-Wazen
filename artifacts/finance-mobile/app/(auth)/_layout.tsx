import { Stack } from "expo-router";
import { View } from "react-native";
import { useBoldColors } from "@/hooks/useBoldColors";

export default function AuthLayout() {
  const colors = useBoldColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </View>
  );
}
