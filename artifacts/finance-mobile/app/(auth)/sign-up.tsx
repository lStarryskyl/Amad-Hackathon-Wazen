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
import { useSignUp } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [step, setStep] = React.useState<"register" | "verify">("register");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
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

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setFormError("");
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      setFormError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setFormError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/onboarding");
      } else {
        setFormError("Verification didn't complete. Please check the code and try again.");
      }
    } catch (err: unknown) {
      setFormError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const onBackToRegister = () => {
    setStep("register");
    setCode("");
    setFormError("");
  };

  const isVerifying = step === "verify";

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
              : "Know your money. Before it knows you."}
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
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Use 8+ characters with letters, numbers, and symbols.
                </Text>
              </View>

              {formError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
                onPress={onSignUpPress}
                disabled={loading || !isLoaded}
                activeOpacity={0.85}
                testID="button-create-account"
              >
                {loading ? (
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
                    autoFocus
                    testID="input-verification-code"
                  />
                </View>
              </View>

              {formError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: loading ? 0.75 : 1 }]}
                onPress={onPressVerify}
                disabled={loading || !isLoaded}
                activeOpacity={0.85}
                testID="button-verify-email"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={onBackToRegister}>
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

  brand: { alignItems: "center", marginBottom: 40 },
  logoWrap: { width: 80, height: 80, borderRadius: 24, overflow: "hidden", marginBottom: 16 },
  logoImg: { width: 80, height: 80 },
  tagline: { fontSize: 18, fontFamily: "Lora_400Regular_Italic", textAlign: "center", marginTop: 4 },

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
  hint: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 6 },
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

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 15, fontFamily: "Outfit_400Regular" },
  footerLink: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },

  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
  backText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
});
