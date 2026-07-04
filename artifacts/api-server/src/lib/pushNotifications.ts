import Expo, { ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export interface PushAlert {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotifications(
  tokens: string[],
  alert: PushAlert
): Promise<void> {
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    sound: "default" as const,
    title: alert.title,
    body: alert.body,
    data: alert.data ?? {},
    channelId: "guardrail-alerts",
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("[push] Failed to send notification chunk", err);
    }
  }
}
