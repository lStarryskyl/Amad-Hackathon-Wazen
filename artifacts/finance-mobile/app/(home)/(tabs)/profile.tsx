import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useUser, useAuth } from "@clerk/expo";
import { getDisplayName } from "@/utils/displayName";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import { Radius } from "@/constants/colors";
import { Chip, haptic } from "@/components/ui";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const NOTIF_KEY = "wazen_notifications_enabled";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const { canInstall, needsManualIOSInstall, installed, promptInstall } = usePwaInstall();

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((v) => {
      if (v === "off") setNotificationsOn(false);
    });
  }, []);

  const toggleNotifications = (value: boolean) => {
    haptic("light");
    setNotificationsOn(value);
    AsyncStorage.setItem(NOTIF_KEY, value ? "on" : "off");
  };

  const handleSignOut = async () => {
    haptic("medium");
    await signOut();
  };

  const handleInstallPress = async () => {
    haptic("medium");
    if (needsManualIOSInstall) {
      Alert.alert(
        "Install Wazen",
        "Tap the Share icon in Safari's toolbar, then choose \"Add to Home Screen\"."
      );
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") haptic("success");
    else if (outcome === "unavailable") {
      Alert.alert("Already installable", "Use your browser's install icon in the address bar.");
    }
  };

  const handleDevReset = () => {
    Alert.alert(
      "Reset All Data",
      "This wipes your accounts, transactions, goals, and all AI outputs so you can test the full onboarding flow from scratch. Sign out will happen automatically after reset.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            setResetting(true);
            try {
              const token = await getToken();
              const domain = process.env.EXPO_PUBLIC_DOMAIN;
              const base = domain ? `https://${domain}` : "http://localhost:8080";
              const res = await fetch(`${base}/api/dev/reset`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Reset failed");
              queryClient.clear();
              Alert.alert("Done", data.message, [
                { text: "Sign Out", onPress: handleSignOut },
              ]);
            } catch (err: any) {
              Alert.alert("Error", err.message);
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.emailAddresses[0]?.emailAddress[0].toUpperCase() || "U";

  const SettingItem = ({
    icon,
    title,
    value,
    type = "link",
    onPress,
    onSwitch,
    danger = false,
    last = false,
  }: {
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    value?: boolean;
    type?: "link" | "switch";
    onPress?: () => void;
    onSwitch?: (v: boolean) => void;
    danger?: boolean;
    last?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
      onPress={type === "switch" ? undefined : () => { haptic("light"); onPress?.(); }}
      activeOpacity={type === "switch" ? 1 : 0.7}
      disabled={type === "switch"}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIcon,
            { backgroundColor: danger ? colors.danger + "1A" : colors.cardElevated },
          ]}
        >
          <Feather
            name={icon}
            size={17}
            color={danger ? colors.danger : colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.settingTitle,
            { color: danger ? colors.danger : colors.text },
          ]}
        >
          {title}
        </Text>
      </View>
      {type === "link" ? (
        <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
      ) : (
        <Switch
          value={value}
          onValueChange={onSwitch}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.profileHeader}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={[styles.avatar, { backgroundColor: colors.card }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
        </LinearGradient>
        <Text style={[styles.name, { color: colors.text }]}>
          {getDisplayName(user, "User")}
        </Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>
          {user?.primaryEmailAddress?.emailAddress}
        </Text>
        <Chip label="Wazen Member" icon="activity" color={colors.accent} />
      </View>

      {/* ── Install ── */}
      {Platform.OS === "web" && !installed && (canInstall || needsManualIOSInstall) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            GET THE APP
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingItem
              icon="download"
              title="Install Wazen"
              onPress={handleInstallPress}
              last
            />
          </View>
        </View>
      )}

      {/* ── Preferences ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          PREFERENCES
        </Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingItem
            icon="shield"
            title="Privacy & Data"
            onPress={() => router.push("/open-banking")}
          />
          <SettingItem
            icon="link"
            title="Connected Banks"
            onPress={() => router.push("/open-banking/connections")}
          />
          <SettingItem
            icon="bell"
            title="Notifications"
            type="switch"
            value={notificationsOn}
            onSwitch={toggleNotifications}
          />
          <SettingItem
            icon="moon"
            title="Dark Mode"
            type="switch"
            value={isDark}
            onSwitch={() => { haptic("light"); toggleTheme(); }}
            last
          />
        </View>
      </View>

      {/* ── Support ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          SUPPORT
        </Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingItem
            icon="help-circle"
            title="Help & Support"
            onPress={() =>
              Alert.alert(
                "Help & Support",
                "Questions or feedback? Reach the Wazen team at support@wazen.app and we'll get back to you."
              )
            }
          />
          <SettingItem
            icon="info"
            title="About Wazen"
            onPress={() =>
              Alert.alert(
                "About Wazen",
                "Wazen v1.0.0\n\nAI-powered financial balance. Wazen scores your spending decisions, builds rescue plans when budgets slip, narrates your money story, and simulates what-if scenarios on your real habits."
              )
            }
            last
          />
        </View>
      </View>

      {/* ── Developer Tools ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          DEVELOPER
        </Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingItem
            icon="refresh-cw"
            title="Reset All Data"
            danger
            onPress={handleDevReset}
            last
          />
        </View>
        <Text style={[styles.devNote, { color: colors.mutedForeground }]}>
          Wipes all your data so you can re-test the full onboarding flow. Development only.
        </Text>
      </View>

      {/* ── Sign Out ── */}
      <TouchableOpacity
        style={[
          styles.signOutButton,
          { backgroundColor: colors.danger + "12", borderColor: colors.danger + "30", borderWidth: 1 },
        ]}
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        {resetting ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <>
            <Feather name="log-out" size={18} color={colors.danger} />
            <Text style={[styles.signOutText, { color: colors.danger }]}>
              Sign Out
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Branding ── */}
      <View style={styles.brandRow}>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={[styles.brandName, { color: colors.mutedForeground }]}>Wazen</Text>
        <Text style={[styles.brandVersion, { color: colors.mutedForeground }]}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  profileHeader: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 20, gap: 0 },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 34, fontFamily: "Lora_700Bold" },
  name: { fontSize: 24, fontFamily: "Outfit_700Bold", marginBottom: 4, letterSpacing: -0.5 },
  email: { fontSize: 14.5, fontFamily: "Outfit_400Regular", marginBottom: 14 },

  section: { marginBottom: 28, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 1.4,
    marginBottom: 10,
    marginLeft: 6,
  },
  settingsCard: { borderRadius: Radius.lg, overflow: "hidden", borderWidth: 1 },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 13 },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm + 2,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTitle: { fontSize: 15.5, fontFamily: "Outfit_500Medium" },
  devNote: { fontSize: 12.5, marginTop: 10, marginLeft: 6, lineHeight: 19, fontFamily: "Outfit_400Regular" },

  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    padding: 17,
    borderRadius: Radius.pill,
    gap: 10,
    marginBottom: 36,
  },
  signOutText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },

  brandRow: { alignItems: "center", gap: 5, paddingBottom: 16 },
  brandLogo: { width: 38, height: 38, opacity: 0.5 },
  brandName: { fontSize: 14, fontFamily: "Outfit_600SemiBold", opacity: 0.55 },
  brandVersion: { fontSize: 12, fontFamily: "Outfit_400Regular", opacity: 0.4 },
});
