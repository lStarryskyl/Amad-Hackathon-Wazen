import React from "react";
import { shadow } from "@/utils/shadow";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from "react-native";
import { useSignIn } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const FEATURES = [
  { icon: "activity", label: "AI Financial Balance" },
  { icon: "trending-up", label: "Smart Money Insights" },
  { icon: "zap", label: "Digital Twin Scenarios" },
];

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPass, setShowPass] = React.useState(false);

  const extractError = (err: unknown): string => {
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      const errs = e.errors as Array<{ longMessage?: string; message?: string }> | undefined;
      if (Array.isArray(errs) && errs.length > 0) {
        return errs[0].longMessage || errs[0].message || "An error occurred.";
      }
      if (typeof e.message === "string") return e.message;
    }
    return "Something went wrong. Please try again.";
  };

  const onSignInPress = async () => {
    if (!isLoaded) {
      setFormError("Still connecting — please wait a moment and try again.");
      return;
    }
    setLoading(true);
    setFormError("");
    try {
      const result = await signIn.create({ identifier: emailAddress, password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(home)/(tabs)");
      } else if (
        result.status === "needs_second_factor" ||
        // @ts-ignore — Clerk may return needs_client_trust on new devices
        result.status === "needs_client_trust"
      ) {
        // New-device verification or 2FA — send an email code
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setVerifying(true);
      } else if (result.status) {
        setFormError(
          `Additional verification required: ${String(result.status).replace(/_/g, " ")}.`,
        );
      }
    } catch (err: unknown) {
      setFormError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) {
      setFormError("Still connecting — please wait a moment and try again.");
      return;
    }
    setLoading(true);
    setFormError("");
    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(home)/(tabs)");
      } else {
        setFormError("That code didn't work. Please try again.");
      }
    } catch (err: unknown) {
      setFormError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const onBackToSignIn = () => {
    setVerifying(false);
    setCode("");
    setFormError("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand ── */}
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            {verifying
              ? "Check your inbox for a code"
              : "Know your money. Before it knows you."}
          </Text>

          {!verifying && (
            <View style={styles.featurePills}>
              {FEATURES.map((f) => (
                <View
                  key={f.icon}
                  style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Feather name={f.icon as "activity"} size={11} color={colors.primary} />
                  <Text style={[styles.pillText, { color: colors.textSecondary }]}>{f.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Form ── */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {verifying ? "Verify it's you" : "Welcome back"}
          </Text>

          {!verifying ? (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="mail" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    onChangeText={setEmailAddress}
                    keyboardType="email-address"
                    autoComplete="email"
                    testID="input-email"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={password}
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPass}
                    onChangeText={setPassword}
                    autoComplete="password"
                    testID="input-password"
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              {formError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]} testID="text-signin-error">
                    {formError}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
                onPress={onSignInPress}
                disabled={loading}
                activeOpacity={0.85}
                testID="button-sign-in"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.verifyHint, { color: colors.mutedForeground }]}>
                You're signing in from a new device. We sent a 6-digit code to {emailAddress}.
              </Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Code</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="key" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text, letterSpacing: 4 }]}
                    value={code}
                    placeholder="123456"
                    placeholderTextColor={colors.mutedForeground}
                    onChangeText={setCode}
                    keyboardType="numeric"
                    maxLength={6}
                    autoFocus
                    testID="input-verification-code"
                  />
                </View>
              </View>

              {formError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]} testID="text-verify-error">
                    {formError}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
                onPress={onVerifyPress}
                disabled={loading}
                activeOpacity={0.85}
                testID="button-verify-code"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaText}>Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={onBackToSignIn}>
                <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {!verifying && (
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              No account?{" "}
            </Text>
            <Link href="/(auth)/sign-up">
              <Text style={[styles.footerLink, { color: colors.primary }]}>Create one free</Text>
            </Link>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },

  brand: { alignItems: "center", marginBottom: 40 },
  logoWrap: { width: 80, height: 80, borderRadius: 24, overflow: "hidden", marginBottom: 16 },
  logoImg: { width: 80, height: 80 },
  tagline: { fontSize: 18, fontFamily: "Lora_400Regular_Italic", textAlign: "center", marginBottom: 24, marginTop: 4 },
  featurePills: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontFamily: "Outfit_500Medium" },

  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    marginBottom: 20,
    ...shadow({ opacity: 0.03, radius: 16, elevation: 2 }),
  },
  formTitle: { fontSize: 22, fontFamily: "Lora_700Bold", marginBottom: 24 },
  verifyHint: { fontSize: 14, fontFamily: "Outfit_400Regular", marginBottom: 20, lineHeight: 22 },

  field: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: "Outfit_600SemiBold", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontFamily: "Outfit_400Regular" },
  eyeBtn: { padding: 4 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: "Outfit_500Medium", flex: 1 },

  cta: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontSize: 16, fontFamily: "Outfit_600SemiBold" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  footerText: { fontSize: 15, fontFamily: "Outfit_400Regular" },
  footerLink: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },

  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
  backText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
});
