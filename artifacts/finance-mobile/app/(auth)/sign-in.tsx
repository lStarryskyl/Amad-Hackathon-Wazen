import React from "react";
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
  const { signIn, errors, fetchStatus } = useSignIn();
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

  const finalizeToHome = async () => {
    await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        router.replace(decorateUrl("/(home)/(tabs)") as any);
      },
    });
  };

  const onSignInPress = async () => {
    setLoading(true);
    setFormError("");
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        console.error(JSON.stringify(error, null, 2));
        return;
      }
      if (signIn.status === "complete") {
        await finalizeToHome();
      } else if (
        signIn.status === "needs_second_factor" ||
        signIn.status === "needs_client_trust"
      ) {
        // Clerk asks for an emailed code when signing in from a new device
        // (client trust) or when 2FA is enabled for the account.
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) {
          console.error(JSON.stringify(sendError, null, 2));
          setFormError("We couldn't send the verification code. Please try again.");
          return;
        }
        setVerifying(true);
      } else if (signIn.status) {
        setFormError(
          `Additional verification is required to sign in (${String(signIn.status).replace(/_/g, " ")}).`,
        );
      }
    } catch (err: any) {
      console.error(err);
      setFormError("Something went wrong signing you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    setLoading(true);
    setFormError("");
    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code });
      if (error) {
        console.error(JSON.stringify(error, null, 2));
        return;
      }
      if (signIn.status === "complete") {
        await finalizeToHome();
      } else {
        setFormError("That code didn't work. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setFormError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const errorMessage =
    formError ||
    errors.fields.identifier?.message ||
    errors.fields.password?.message ||
    (errors.fields as any).code?.message ||
    (errors as any).message;

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
                  <Feather name={f.icon as any} size={11} color={colors.primary} />
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

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]} testID="text-signin-error">{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: loading || fetchStatus === "fetching" ? 0.75 : 1 }]}
                onPress={onSignInPress}
                disabled={loading || fetchStatus === "fetching"}
                activeOpacity={0.85}
                testID="button-sign-in"
              >
                {loading || fetchStatus === "fetching" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.verifyHint, { color: colors.mutedForeground }]}>
                You're signing in from a new device, so we sent a 6-digit code to {emailAddress}
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
                    testID="input-verification-code"
                  />
                </View>
              </View>

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]} testID="text-verify-error">{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: loading || fetchStatus === "fetching" ? 0.75 : 1 }]}
                onPress={onVerifyPress}
                disabled={loading || fetchStatus === "fetching"}
                activeOpacity={0.85}
                testID="button-verify-code"
              >
                {loading || fetchStatus === "fetching" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaText}>Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setVerifying(false);
                  setCode("");
                  setFormError("");
                }}
              >
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

  brand: { alignItems: "center", marginBottom: 28 },
  logoWrap: { width: 100, height: 100, borderRadius: 22, overflow: "hidden", marginBottom: 14 },
  logoImg: { width: 100, height: 100 },
  tagline: { fontSize: 14, textAlign: "center", marginBottom: 16 },
  featurePills: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: "500" },

  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
  },
  formTitle: { fontSize: 18, fontWeight: "700", marginBottom: 20 },
  verifyHint: { fontSize: 13, marginBottom: 20, lineHeight: 20 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15 },
  eyeBtn: { padding: 4 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, flex: 1 },

  cta: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: "700" },

  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
  backText: { fontSize: 13 },
});
