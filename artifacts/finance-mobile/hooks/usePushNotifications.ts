import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { registerPushToken } from "@workspace/api-client-react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

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
    // Push tokens require an EAS project ID — not available in Expo Go or web preview
    console.log("[push] Push tokens unavailable in this environment (Expo Go / no projectId)");
    return null;
  }
}

export function usePushNotifications() {
  const router = useRouter();
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          registerPushToken(token).catch((err: unknown) =>
            console.error("[push] Failed to save push token", err)
          );
        }
      })
      .catch((err: unknown) => console.error("[push] Registration error", err));

    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
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

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [router]);
}
