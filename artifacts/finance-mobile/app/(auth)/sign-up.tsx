import React, { useCallback } from "react";
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
} from "react-native";
import { useSignUp, useSSO } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSignUpPress = async () => {
    setLoading(true);
    try {
      const { error } = await signUp.password({
        emailAddress,
        password,
      });

      if (error) {
        console.error(JSON.stringify(error, null, 2));
        return;
      }

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
      await signUp.verifications.verifyEmailCode({
        code,
      });

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

  const onGoogleSignUpPress = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: ({ decorateUrl }) => {
            router.replace(decorateUrl("/onboarding") as any);
          },
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  }, [startSSOFlow]);

  const isVerifying = 
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0;

  const errorMessage = errors.fields.emailAddress?.message || errors.fields.password?.message || errors.fields.code?.message || (errors as any).message;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Feather name="shield" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {isVerifying ? "Verify Email" : "Create Account"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {isVerifying
              ? "Check your inbox for a verification code"
              : "AI-Powered Financial Security"}
          </Text>
        </View>

        <View style={styles.form}>
          {!isVerifying ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Email Address
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  autoCapitalize="none"
                  value={emailAddress}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  onChangeText={setEmailAddress}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Password
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={password}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={true}
                  onChangeText={setPassword}
                />
              </View>

              {errorMessage && (
                <Text style={[styles.error, { color: colors.danger }]}>{errorMessage}</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                  (loading || fetchStatus === 'fetching') && styles.buttonDisabled,
                ]}
                onPress={onSignUpPress}
                disabled={loading || fetchStatus === 'fetching'}
              >
                {loading || fetchStatus === 'fetching' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
                <Text
                  style={[styles.dividerText, { color: colors.mutedForeground }]}
                >
                  or continue with
                </Text>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                style={[
                  styles.oauthButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={onGoogleSignUpPress}
              >
                <Feather name="chrome" size={20} color={colors.text} />
                <Text style={[styles.oauthButtonText, { color: colors.text }]}>
                  Google
                </Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={{ color: colors.mutedForeground }}>
                  Already have an account?{" "}
                </Text>
                <Link href="/(auth)/sign-in">
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>
                    Sign In
                  </Text>
                </Link>
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Verification Code
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={code}
                  placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  onChangeText={setCode}
                  keyboardType="numeric"
                />
              </View>

              {errorMessage && (
                <Text style={[styles.error, { color: colors.danger }]}>{errorMessage}</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                  (loading || fetchStatus === 'fetching') && styles.buttonDisabled,
                ]}
                onPress={onPressVerify}
                disabled={loading || fetchStatus === 'fetching'}
              >
                {loading || fetchStatus === 'fetching' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 20 }]}
                onPress={() => signUp.reset()}
              >
                <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
                  Back to Sign Up
                </Text>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  oauthButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  oauthButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  secondaryButton: {
    padding: 10,
  },
});
