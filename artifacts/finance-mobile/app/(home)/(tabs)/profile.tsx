import React, { useState } from "react";
import {
  View,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useUser, useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useBoldColors } from "@/hooks/useBoldColors";
import {
  BoldButton,
  BoldCard,
  BoldText,
  BoldAvatar,
  BoldBadge,
} from "@/components/bold";

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const colors = useBoldColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: "center", paddingVertical: 28, paddingHorizontal: 20 }}>
        <BoldAvatar
          size="xl"
          name={user?.fullName || user?.username || "User"}
          style={{ marginBottom: 14 }}
        />
        <BoldText variant="heading1" weight="700" color={colors.text} style={{ marginBottom: 4 }}>
          {user?.fullName || user?.username || "User"}
        </BoldText>
        <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ marginBottom: 12 }}>
          {user?.primaryEmailAddress?.emailAddress}
        </BoldText>
        <BoldBadge variant="success" size="md">
          <Feather name="activity" size={11} color={colors.success} style={{ marginRight: 4 }} />
          Wazen Member
        </BoldBadge>
      </View>

      <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
        <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 8, marginLeft: 4 }}>
          PREFERENCES
        </BoldText>
        <BoldCard variant="outlined" padding="none">
          <SettingRow
            icon="shield"
            title="Privacy & Data"
            colors={colors}
            onPress={() => {}}
          />
          <SettingRow
            icon="bell"
            title="Notifications"
            colors={colors}
            type="switch"
            switchValue={notificationsOn}
            onSwitchChange={setNotificationsOn}
          />
          <SettingRow
            icon="moon"
            title="Theme"
            colors={colors}
            type="text"
            value="System"
          />
        </BoldCard>
      </View>

      <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
        <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 8, marginLeft: 4 }}>
          SUPPORT
        </BoldText>
        <BoldCard variant="outlined" padding="none">
          <SettingRow icon="help-circle" title="Help & Support" colors={colors} onPress={() => {}} />
          <SettingRow icon="info" title="About Wazen" colors={colors} onPress={() => {}} />
        </BoldCard>
      </View>

      <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
        <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 8, marginLeft: 4 }}>
          DEVELOPER
        </BoldText>
        <BoldCard variant="outlined" padding="none">
          <SettingRow
            icon="refresh-cw"
            title="Reset All Data"
            colors={colors}
            danger
            onPress={handleDevReset}
          />
        </BoldCard>
        <BoldText variant="bodySM" color={colors.mutedForeground} style={{ marginTop: 8, marginLeft: 4, lineHeight: 18 }}>
          Wipes all your data so you can re-test the full onboarding flow. Development only.
        </BoldText>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
        <BoldButton
          variant="danger"
          size="lg"
          fullWidth
          onPress={handleSignOut}
          loading={resetting}
          leftIcon={<Feather name="log-out" size={18} color="#fff" />}
        >
          Sign Out
        </BoldButton>
      </View>

      <View style={{ alignItems: "center", gap: 4, paddingBottom: 8 }}>
        <BoldText variant="bodySM" color={colors.mutedForeground} style={{ opacity: 0.5 }}>
          Wazen
        </BoldText>
        <BoldText variant="caption" color={colors.mutedForeground} style={{ opacity: 0.4 }}>
          v1.0.0
        </BoldText>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  title,
  colors,
  type = "link",
  value,
  onPress,
  danger = false,
  switchValue,
  onSwitchChange,
}: {
  icon: string;
  title: string;
  colors: ReturnType<typeof useBoldColors>;
  type?: "link" | "switch" | "text";
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: danger ? colors.danger + "20" : colors.cardElevated,
          }}
        >
          <Feather
            name={icon as any}
            size={18}
            color={danger ? colors.danger : colors.textSecondary}
          />
        </View>
        <BoldText
          variant="bodyMD"
          weight="500"
          color={danger ? colors.danger : colors.text}
        >
          {title}
        </BoldText>
      </View>
      {type === "link" && (
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      )}
      {type === "switch" && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      )}
      {type === "text" && value && (
        <BoldText variant="bodySM" color={colors.mutedForeground}>
          {value}
        </BoldText>
      )}
    </View>
  );
}
