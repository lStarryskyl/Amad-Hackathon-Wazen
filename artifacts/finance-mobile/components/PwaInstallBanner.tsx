import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Radius } from "@/constants/colors";
import { Card, IconBadge, PrimaryButton, haptic } from "@/components/ui";

const DISMISS_KEY = "wazen_pwa_banner_dismissed";

/**
 * Web-only install banner. Renders nothing on native (Expo Go / EAS builds)
 * and nothing once the app is already running installed (standalone mode).
 */
export default function PwaInstallBanner() {
  const colors = useColors();
  const { canInstall, needsManualIOSInstall, installed, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // default hidden until checked
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    AsyncStorage.getItem(DISMISS_KEY).then((v) => setDismissed(v === "1"));
  }, []);

  if (Platform.OS !== "web" || installed || dismissed) return null;
  if (!canInstall && !needsManualIOSInstall) return null;

  const dismiss = () => {
    haptic("light");
    setDismissed(true);
    AsyncStorage.setItem(DISMISS_KEY, "1");
  };

  const handleInstall = async () => {
    haptic("medium");
    if (needsManualIOSInstall) {
      setShowIOSHelp((v) => !v);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") haptic("success");
  };

  return (
    <Card variant="elevated" style={[styles.card, { borderColor: colors.primary + "35" }]}>
      <View style={styles.row}>
        <IconBadge icon="download" color={colors.primary} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Install Wazen</Text>
          <Text style={[styles.desc, { color: colors.mutedForeground }]}>
            Add it to your home screen for the full app experience — no store required.
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {showIOSHelp && (
        <View style={[styles.iosHelp, { backgroundColor: colors.cardElevated }]}>
          <Text style={[styles.iosHelpText, { color: colors.textSecondary }]}>
            Tap the Share icon <Feather name="share" size={13} color={colors.textSecondary} /> in Safari's toolbar,
            then choose "Add to Home Screen".
          </Text>
        </View>
      )}

      <PrimaryButton
        label={needsManualIOSInstall ? "How to Install" : "Install App"}
        icon="download"
        small
        onPress={handleInstall}
        style={{ marginTop: 14, alignSelf: "flex-start" }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  title: { fontSize: 15.5, fontFamily: "Outfit_700Bold", marginBottom: 3 },
  desc: { fontSize: 13, fontFamily: "Outfit_400Regular", lineHeight: 18 },
  iosHelp: { marginTop: 12, padding: 12, borderRadius: Radius.sm },
  iosHelpText: { fontSize: 12.5, fontFamily: "Outfit_400Regular", lineHeight: 19 },
});
