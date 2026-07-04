import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useUser, useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.emailAddresses[0]?.emailAddress[0].toUpperCase() || "U";

  const SettingItem = ({ icon, title, value, type = 'link' }: any) => (
    <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: colors.cardElevated }]}>
          <Feather name={icon} size={18} color={colors.textSecondary} />
        </View>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {type === 'link' ? (
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      ) : type === 'switch' ? (
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
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>
          {user?.fullName || user?.username || "User"}
        </Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>
          {user?.primaryEmailAddress?.emailAddress}
        </Text>
        <Text style={[styles.memberSince, { color: colors.mutedForeground }]}>
          Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'recently'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>8</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Accounts</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>4</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Goals</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>124</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Transactions</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingItem icon="shield" title="Privacy & Data" />
          <SettingItem icon="bell" title="Notifications" type="switch" value={true} />
          <SettingItem icon="moon" title="Theme" value="Dark" type="text" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingItem icon="help-circle" title="Help & Support" />
          <SettingItem icon="info" title="About" />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.signOutButton, { backgroundColor: colors.danger + "20" }]}
        onPress={handleSignOut}
      >
        <Feather name="log-out" size={20} color={colors.danger} />
        <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 12,
  },
  settingsCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
