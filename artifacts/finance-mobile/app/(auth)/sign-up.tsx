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
import { useSignUp } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBoldColors } from "@/hooks/useBoldColors";
import {
  BoldButton,
  BoldCard,
  BoldText,
  BoldBadge,
} from "@/components/bold";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const colors = useBoldColors();
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
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Feather name="activity" size={56} color={colors.primary} style={{ marginBottom: 14 }} />
          <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ textAlign: "center" }}>
            {isVerifying
              ? "Check your inbox for a code"
              : "Start tracking your financial pulse"}
          </BoldText>
        </View>

        <BoldCard variant="outlined" padding="lg" style={{ marginBottom: 20 }}>
          <BoldText variant="heading3" weight="700" color={colors.text} style={{ marginBottom: 20 }}>
            {isVerifying ? "Verify your email" : "Create your account"}
          </BoldText>

          {!isVerifying ? (
            <>
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
                    autoComplete="new-password"
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
                onPress={onSignUpPress}
                disabled={loading || fetchStatus === "fetching"}
                loading={loading || fetchStatus === "fetching"}
              >
                Create Account
              </BoldButton>

              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
                <BoldText variant="bodyMD" color={colors.mutedForeground}>
                  Already have an account?{" "}
                </BoldText>
                <Link href="/(auth)/sign-in">
                  <BoldText variant="bodyMD" weight="700" color={colors.primary}>
                    Sign in
                  </BoldText>
                </Link>
              </View>
            </>
          ) : (
            <>
              <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ marginBottom: 20, lineHeight: 20 }}>
                We sent a 6-digit code to {emailAddress}
              </BoldText>

              <View style={{ marginBottom: 16 }}>
                <BoldText variant="caption" color={colors.textSecondary} style={{ marginBottom: 6 }}>
                  VERIFICATION CODE
                </BoldText>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50, backgroundColor: colors.background }}>
                  <Feather name="key" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 15, color: colors.text, letterSpacing: 4 }}
                    value={code}
                    placeholder="123456"
                    placeholderTextColor={colors.mutedForeground}
                    onChangeText={setCode}
                    keyboardType="numeric"
                    maxLength={6}
                  />
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
                onPress={onPressVerify}
                disabled={loading || fetchStatus === "fetching"}
                loading={loading || fetchStatus === "fetching"}
              >
                Verify Email
              </BoldButton>

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 }}
                onPress={() => signUp.reset()}
              >
                <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                <BoldText variant="bodySM" color={colors.mutedForeground}>Back to sign up</BoldText>
              </TouchableOpacity>
            </>
          )}
        </BoldCard>

        <View nativeID="clerk-captcha" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
