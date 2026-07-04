import React, { useState } from "react";
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
} from "react-native";
import { useUser, useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
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
    danger = false,
  }: any) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIcon,
            { backgroundColor: danger ? colors.danger + "20" : colors.cardElevated },
          ]}
        >
          <Feather
            name={icon}
            size={18}
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
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      ) : type === "switch" ? (
        <Switch
          value={value}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <Text style={{ color: colors.mutedForeground }}>{value}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "30", borderColor: colors.primary + "60", borderWidth: 2 }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>
          {user?.fullName || user?.username || "User"}
        </Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>
          {user?.primaryEmailAddress?.emailAddress}
        </Text>
        <View style={[styles.memberBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="shield" size={11} color={colors.accent} />
          <Text style={[styles.memberText, { color: colors.accent }]}>
            Guardia Member
          </Text>
        </View>
      </View>

      {/* ── Preferences ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          PREFERENCES
        </Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingItem icon="shield" title="Privacy & Data" />
          <SettingItem
            icon="bell"
            title="Notifications"
            type="switch"
            value={true}
          />
          <SettingItem icon="moon" title="Theme" value="Dark" type="text" />
        </View>
      </View>

      {/* ── Support ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          SUPPORT
        </Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingItem icon="help-circle" title="Help & Support" />
          <SettingItem icon="info" title="About Guardia" />
        </View>
      </View>

      {/* ── Developer Tools ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          DEVELOPER
        </Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="refresh-cw"
            title="Reset All Data"
            danger
            onPress={handleDevReset}
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
          { backgroundColor: colors.danger + "15", borderColor: colors.danger + "30", borderWidth: 1 },
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
        <Text style={[styles.brandName, { color: colors.mutedForeground }]}>Guardia</Text>
        <Text style={[styles.brandVersion, { color: colors.mutedForeground }]}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  profileHeader: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  email: { fontSize: 14, marginBottom: 12 },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  memberText: { fontSize: 12, fontWeight: "600" },

  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsCard: { borderRadius: 20, overflow: "hidden" },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTitle: { fontSize: 16, fontWeight: "500" },
  devNote: { fontSize: 12, marginTop: 8, marginLeft: 4, lineHeight: 18 },

  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginBottom: 32,
  },
  signOutText: { fontSize: 16, fontWeight: "600" },

  brandRow: { alignItems: "center", gap: 4, paddingBottom: 8 },
  brandLogo: { width: 32, height: 32, opacity: 0.5 },
  brandName: { fontSize: 13, fontWeight: "700", opacity: 0.5 },
  brandVersion: { fontSize: 11, opacity: 0.4 },
});
