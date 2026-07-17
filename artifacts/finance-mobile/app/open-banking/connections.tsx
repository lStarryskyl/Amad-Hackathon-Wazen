import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetConnections,
  useDisconnectBank,
  getConnectionsQueryKey,
  type BankConnection,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const TYPE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  checking: "credit-card",
  savings: "umbrella",
  credit: "trending-down",
  investment: "trending-up",
};

export default function ConnectionsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch, error } = useGetConnections();
  const disconnect = useDisconnectBank({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getConnectionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/summary`] });
    },
    onError: (err: any) => {
      Alert.alert("Couldn't disconnect", err?.message || "Something went wrong. Please try again.");
    },
  });

  const confirmDisconnect = (connection: BankConnection) => {
    const n = connection.accounts.length;
    Alert.alert(
      `Disconnect ${connection.institutionName}?`,
      `Wazen will immediately lose access to ${n} account${n === 1 ? "" : "s"} from this bank. You can reconnect anytime.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnect.mutate(connection.institutionName),
        },
      ]
    );
  };

  const connections = data?.connections ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Connected Banks</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          These are the banks and data sources Wazen can currently access. Disconnect any of them
          at any time — access stops immediately.
        </Text>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={[styles.centerBox, { gap: 12 }]}>
            <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Couldn't load connections</Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : connections.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.cardElevated }]}>
              <Feather name="link" size={26} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No banks connected</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              You haven't connected any banks or data sources yet. Nothing is shared with Wazen
              until you do.
            </Text>
          </View>
        ) : (
          connections.map((conn) => (
            <View
              key={conn.institutionName}
              style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.connectionHeader}>
                <View style={[styles.bankIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="home" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bankName, { color: colors.text }]}>
                    {conn.institutionName}
                  </Text>
                  {conn.connectedAt && (
                    <Text style={[styles.bankMeta, { color: colors.mutedForeground }]}>
                      Connected {new Date(conn.connectedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  )}
                </View>
                <View style={[styles.activeBadge, { backgroundColor: colors.accent + "18" }]}>
                  <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.activeText, { color: colors.accent }]}>Active</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {conn.accounts.map((acc) => (
                <View key={acc.id} style={styles.accountRow}>
                  <Feather
                    name={TYPE_ICON[acc.accountType] || "credit-card"}
                    size={15}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.accountName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {acc.accountName}
                  </Text>
                  <Text style={[styles.accountType, { color: colors.mutedForeground }]}>
                    {acc.accountType}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.disconnectButton, { backgroundColor: colors.danger + "12", borderColor: colors.danger + "30" }]}
                onPress={() => confirmDisconnect(conn)}
                disabled={disconnect.isPending}
                activeOpacity={0.8}
              >
                {disconnect.isPending && disconnect.variables === conn.institutionName ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Feather name="x-octagon" size={15} color={colors.danger} />
                    <Text style={[styles.disconnectText, { color: colors.danger }]}>Disconnect</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        {connections.length > 0 && (
          <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
            Disconnecting removes Wazen's access to this bank's data. Want a full clean slate? You
            can also erase everything Wazen holds about you from Profile.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },

  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 20 },

  centerBox: { alignItems: "center", paddingVertical: 60 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },

  emptyCard: {
    alignItems: "center",
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: "center" },

  connectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  connectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  bankName: { fontSize: 16, fontWeight: "700" },
  bankMeta: { fontSize: 12, marginTop: 2 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontWeight: "700" },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },

  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  accountName: { fontSize: 14, fontWeight: "500", flex: 1 },
  accountType: { fontSize: 12, textTransform: "capitalize" },

  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  disconnectText: { fontSize: 14, fontWeight: "600" },

  footnote: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8, paddingHorizontal: 12 },
});
