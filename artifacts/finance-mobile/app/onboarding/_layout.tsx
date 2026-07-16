import { Stack } from "expo-router";
import { useBoldColors } from "@/hooks/useBoldColors";

export default function OnboardingLayout() {
  const colors = useBoldColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
