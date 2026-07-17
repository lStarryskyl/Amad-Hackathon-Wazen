import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { registerPushToken } from "@workspace/api-client-react";

// expo-notifications remote push was removed from Expo Go in SDK 53.
// Only import and use it when running in a proper dev/prod build.
const isExpoGo = Constants.appOwnership === "expo";

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo || Platform.OS === "web") return null;

  // Lazy-import so the module is never evaluated in Expo Go
  const Notifications = await import("expo-notifications");

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("guardrail-alerts", {
      name: "Spending Guardrail Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3B82F6",
      sound: "default",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let permissions: any = await Notifications.getPermissionsAsync();

  if (!permissions.canAskAgain && !permissions.granted) {
    console.log("[push] Permissions permanently denied");
    return null;
  }

  if (!permissions.granted) {
    permissions = await Notifications.requestPermissionsAsync();
  }

  if (!permissions.granted) {
    console.log("[push] Permission not granted for push notifications");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    console.log("[push] Push tokens unavailable in this environment (no projectId)");
    return null;
  }
}

export function usePushNotifications() {
  const router = useRouter();
  // Keep a typed ref that works whether or not Notifications was loaded
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (isExpoGo || Platform.OS === "web") return;

    // Set the notification handler lazily
    import("expo-notifications").then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      listenerRef.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data as Record<string, unknown>;
          if (data?.screen === "progress") {
            const guardrailId = data?.guardrailId ? String(data.guardrailId) : undefined;
            const href = guardrailId
              ? `/(home)/(tabs)/progress?guardrailId=${guardrailId}`
              : "/(home)/(tabs)/progress";
            router.push(href as Parameters<typeof router.push>[0]);
          }
        }
      );
    });

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          registerPushToken(token).catch((err: unknown) =>
            console.error("[push] Failed to save push token", err)
          );
        }
      })
      .catch((err: unknown) => console.error("[push] Registration error", err));

    return () => {
      listenerRef.current?.remove();
    };
  }, [router]);
}
