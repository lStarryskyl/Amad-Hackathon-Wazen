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
import { useSignUp } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPass, setShowPass] = React.useState(false);

  const onSignUpPress = async () => {
    setLoading(true);
    try {
      const { error } = await signUp.password({ emailAddress, password });
      if (error) { console.error(JSON.stringify(error, null, 2)); return; }
      await signUp.verifications.sendEmailCode();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    setLoading(true);
    try {
      await signUp.verifications.verifyEmailCode({ code });
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            router.replace(decorateUrl("/onboarding") as any);
          },
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isVerifying =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const errorMessage =
    errors.fields.emailAddress?.message ||
    errors.fields.password?.message ||
    errors.fields.code?.message ||
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
            {isVerifying
              ? "Check your inbox for a code"
              : "Start tracking your financial pulse"}
          </Text>
        </View>

        {/* ── Form card ── */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {isVerifying ? "Verify your email" : "Create your account"}
          </Text>

          {!isVerifying ? (
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
                    autoComplete="new-password"
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
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: loading || fetchStatus === "fetching" ? 0.75 : 1 }]}
                onPress={onSignUpPress}
                disabled={loading || fetchStatus === "fetching"}
                activeOpacity={0.85}
                testID="button-create-account"
              >
                {loading || fetchStatus === "fetching" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                  Already have an account?{" "}
                </Text>
                <Link href="/(auth)/sign-in">
                  <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
                </Link>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.verifyHint, { color: colors.mutedForeground }]}>
                We sent a 6-digit code to {emailAddress}
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
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: loading || fetchStatus === "fetching" ? 0.75 : 1 }]}
                onPress={onPressVerify}
                disabled={loading || fetchStatus === "fetching"}
                activeOpacity={0.85}
                testID="button-verify-email"
              >
                {loading || fetchStatus === "fetching" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => signUp.reset()}>
                <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to sign up</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View nativeID="clerk-captcha" />
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
  tagline: { fontSize: 14, textAlign: "center" },

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

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: "700" },

  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
  backText: { fontSize: 13 },
});
