import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSignIn } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBoldColors } from "@/hooks/useBoldColors";
import {
  BoldButton,
  BoldCard,
  BoldText,
  BoldInput,
  BoldBadge,
} from "@/components/bold";

const FEATURES = [
  { icon: "activity", label: "AI Finance Pulse" },
  { icon: "trending-up", label: "Smart Money Insights" },
  { icon: "zap", label: "Digital Twin Scenarios" },
];

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const colors = useBoldColors();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPass, setShowPass] = React.useState(false);

  const onSignInPress = async () => {
    setLoading(true);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) { console.error(JSON.stringify(error, null, 2)); return; }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            router.replace(decorateUrl("/(home)/(tabs)") as any);
          },
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const errorMessage =
    errors.fields.identifier?.message ||
    errors.fields.password?.message ||
    (errors as any).message;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Feather name="activity" size={56} color={colors.primary} style={{ marginBottom: 14 }} />
          <BoldText variant="heading3" weight="700" color={colors.text}>
            Wazen
          </BoldText>
          <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ marginBottom: 16 }}>
            Your AI-powered financial pulse
          </BoldText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {FEATURES.map((f) => (
              <BoldBadge key={f.icon} variant="primary" size="md" style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name={f.icon as any} size={11} color={colors.primary} />
                {f.label}
              </BoldBadge>
            ))}
          </View>
        </View>

        <BoldCard variant="outlined" padding="lg" style={{ marginBottom: 20 }}>
          <BoldText variant="heading3" weight="700" color={colors.text} style={{ marginBottom: 20 }}>
            Welcome back
          </BoldText>

          <View style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.textSecondary} style={{ marginBottom: 6 }}>
              EMAIL
            </BoldText>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50, backgroundColor: colors.background }}>
              <Feather name="mail" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: colors.text }}
                autoCapitalize="none"
                value={emailAddress}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                onChangeText={setEmailAddress}
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.textSecondary} style={{ marginBottom: 6 }}>
              PASSWORD
            </BoldText>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50, backgroundColor: colors.background }}>
              <Feather name="lock" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: colors.text }}
                value={password}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPass}
                onChangeText={setPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.danger + "40", borderRadius: 10, padding: 10, backgroundColor: colors.danger + "18", marginBottom: 12 }}>
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <BoldText variant="bodySM" color={colors.danger} style={{ flex: 1 }}>{errorMessage}</BoldText>
            </View>
          ) : null}

          <BoldButton
            variant="primary"
            size="lg"
            fullWidth
            onPress={onSignInPress}
            disabled={loading || fetchStatus === "fetching"}
            loading={loading || fetchStatus === "fetching"}
          >
            Sign In
          </BoldButton>
        </BoldCard>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
          <BoldText variant="bodyMD" color={colors.mutedForeground}>
            No account?{" "}
          </BoldText>
          <Link href="/(auth)/sign-up">
            <BoldText variant="bodyMD" weight="700" color={colors.primary}>
              Create one free
            </BoldText>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
