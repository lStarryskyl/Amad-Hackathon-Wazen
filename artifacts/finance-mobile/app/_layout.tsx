import { useFonts } from "expo-font";
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit";
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold, Lora_400Regular_Italic } from "@expo-google-fonts/lora";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/expo";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DEV_BYPASS_AUTH } from "@/constants/devFlags";

// EXPO_PUBLIC_API_URL (full URL, e.g. http://localhost:8080) wins for local
// development; EXPO_PUBLIC_DOMAIN (https-only host) is the Replit deploy path.
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (apiUrl) setBaseUrl(apiUrl);
else if (domain) setBaseUrl(`https://${domain}`);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: DEV_BYPASS_AUTH ? 0 : 3 },
  },
});

// Wires the Clerk session token into every API request.
// Only mounted when Clerk is loaded (not in bypass mode).
function AuthTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => { setAuthTokenGetter(null); };
  }, [getToken]);
  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(home)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="+not-found" options={{ headerShown: true }} />
    </Stack>
  );
}

function AppShell({ withAuthSync }: { withAuthSync: boolean }) {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <KeyboardProvider>
                {withAuthSync && <AuthTokenSync />}
                <RootLayoutNav />
              </KeyboardProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold,
    Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold, Lora_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  // Always wrap with ClerkProvider so every useAuth/useUser call has context.
  // In bypass mode we skip ClerkLoaded so the app renders immediately without
  // waiting for Clerk to initialize — that was causing the blank screen on device.
  return (
    <ClerkProvider publishableKey={publishableKey} proxyUrl={proxyUrl}>
      {DEV_BYPASS_AUTH ? (
        <AppShell withAuthSync={false} />
      ) : (
        <ClerkLoaded>
          <AppShell withAuthSync={true} />
        </ClerkLoaded>
      )}
    </ClerkProvider>
  );
}
