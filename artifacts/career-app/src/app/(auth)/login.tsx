import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { z } from "zod";

import { ApiError } from "@/api/errors";
import { useAuth } from "@/auth/auth-provider";
import { hasApiBaseUrl } from "@/config/env";
import { APP_COLORS } from "@/constants/theme";
import { ROLE_HOME_ROUTE } from "@/constants/roles";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  phoneNumber: z
    .string()
    .min(10, "Enter the 10-digit mobile number linked to your account."),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit verification code."),
});

/** Normalises Indian mobile input: keeps 10 digits, strips a leading +91 / 91. */
function normalizePhoneNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  return digits;
}

type Step = "credentials" | "otp";

export default function LoginScreen() {
  const { sendLoginOtp, resendLoginOtp, verifyLoginOtp } = useAuth();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
      }
    };
  }, []);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    return step === "credentials"
      ? email.trim().length > 0 && password.length > 0 && phoneNumber.trim().length >= 10
      : otp.trim().length === 6;
  }, [step, email, password, phoneNumber, otp, isSubmitting]);

  function startResendCooldown() {
    if (cooldownTimer.current) {
      clearInterval(cooldownTimer.current);
    }
    setResendCooldown(30);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((previous) => {
        if (previous <= 1 && cooldownTimer.current) {
          clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    setMessage(null);

    const parsed = credentialsSchema.safeParse({
      email: email.trim(),
      password,
      phoneNumber: normalizePhoneNumber(phoneNumber),
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check your login details.");
      return;
    }

    if (!hasApiBaseUrl()) {
      setMessage("Missing API URL. Add EXPO_PUBLIC_API_URL to .env and restart Expo.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await sendLoginOtp(parsed.data);
      setMaskedPhone(response.phoneNumber);
      setOtp("");
      setStep("otp");
      startResendCooldown();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Please check your credentials and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    setMessage(null);

    const credentials = credentialsSchema.safeParse({
      email: email.trim(),
      password,
      phoneNumber: normalizePhoneNumber(phoneNumber),
    });
    const code = otpSchema.safeParse({ otp: otp.trim() });

    if (!credentials.success) {
      setMessage(credentials.error.issues[0]?.message ?? "Please check your login details.");
      return;
    }

    if (!code.success) {
      setMessage(code.error.issues[0]?.message ?? "Enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await verifyLoginOtp({
        ...credentials.data,
        otp: code.data.otp,
      });
      const destination = ROLE_HOME_ROUTE[user.role] ?? "/(app)";
      try {
        router.replace(destination as never);
      } catch {
        router.replace("/(app)" as never);
      }
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Please check your credentials and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0 || isResending) return;

    setMessage(null);
    setIsResending(true);

    try {
      const response = await resendLoginOtp({
        email: email.trim(),
        password,
        phoneNumber: normalizePhoneNumber(phoneNumber),
      });
      setMaskedPhone(response.phoneNumber);
      setOtp("");
      startResendCooldown();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Could not resend the verification code.",
      );
    } finally {
      setIsResending(false);
    }
  }

  function handleBackToCredentials() {
    setStep("credentials");
    setMessage(null);
    setOtp("");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>C</Text>
            </View>
            <Text style={styles.caption}>Careerly</Text>
          </View>

          <Text style={styles.title}>Sign in</Text>

          <Text style={styles.subtitle}>
            Access jobs, applications, and recruiter messages from the Careerly
            mobile app.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>
                {step === "credentials" ? "Welcome back" : "Verification code"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {step === "credentials"
                  ? "Use your Careerly credentials"
                  : maskedPhone
                    ? `Code sent to ${maskedPhone}`
                    : "Enter the 6-digit code"}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <SymbolView
                name={{ ios: "lock.shield", android: "lock", web: "lock" }}
                size={14}
                tintColor={APP_COLORS.primary}
              />
              <Text style={styles.statusText}>Secure</Text>
            </View>
          </View>

          {step === "credentials" ? (
            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputRow}>
                  <SymbolView
                    name={{ ios: "envelope", android: "email", web: "email" }}
                    size={18}
                    tintColor={APP_COLORS.subtleText}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor={APP_COLORS.subtleText}
                    style={styles.input}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <SymbolView
                    name={{ ios: "lock", android: "lock", web: "lock" }}
                    size={18}
                    tintColor={APP_COLORS.subtleText}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    placeholder="Password"
                    placeholderTextColor={APP_COLORS.subtleText}
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
                    hitSlop={8}
                    style={styles.inputAction}
                  >
                    <SymbolView
                      name={
                        isPasswordVisible
                          ? { ios: "eye.slash", android: "visibility_off", web: "visibility_off" }
                          : { ios: "eye", android: "visibility", web: "visibility" }
                      }
                      size={20}
                      tintColor={APP_COLORS.mutedText}
                    />
                  </Pressable>
                </View>
              </View>

              <View>
                <Text style={styles.label}>Mobile number</Text>
                <View style={styles.inputRow}>
                  <SymbolView
                    name={{ ios: "phone", android: "phone", web: "phone" }}
                    size={18}
                    tintColor={APP_COLORS.subtleText}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="10-digit mobile number"
                    placeholderTextColor={APP_COLORS.subtleText}
                    style={styles.input}
                  />
                </View>
                <Text style={styles.hint}>
                  A 6-digit verification code is sent to the mobile number linked
                  to your account.
                </Text>
              </View>

              {message && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{message}</Text>
                </View>
              )}

              <Pressable
                disabled={!canSubmit}
                onPress={handleSendCode}
                style={[
                  styles.button,
                  canSubmit ? styles.buttonEnabled : styles.buttonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={APP_COLORS.onPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Send verification code</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  value={otp}
                  onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  placeholder="000000"
                  placeholderTextColor={APP_COLORS.subtleText}
                  style={styles.otpInput}
                  maxLength={6}
                />
                <Text style={styles.hint}>
                  Enter the 6-digit code sent to your mobile number.
                </Text>
              </View>

              {message && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{message}</Text>
                </View>
              )}

              <Pressable
                disabled={!canSubmit}
                onPress={handleVerifyCode}
                style={[
                  styles.button,
                  canSubmit ? styles.buttonEnabled : styles.buttonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={APP_COLORS.onPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Verify & sign in</Text>
                )}
              </Pressable>

              <View style={styles.secondaryRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleResendCode}
                  disabled={resendCooldown > 0 || isResending}
                  hitSlop={8}
                >
                  {isResending ? (
                    <ActivityIndicator color={APP_COLORS.primary} size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.linkText,
                        resendCooldown > 0 && styles.linkTextDisabled,
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Resend code"}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleBackToCredentials}
                  hitSlop={8}
                >
                  <Text style={styles.linkText}>Back to login details</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.footerNote}>
          Don&apos;t have an account? Register from the Careerly web portal.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.canvas,
  },
  content: {
    justifyContent: "center",
    minHeight: "100%",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: APP_COLORS.onPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  caption: {
    fontSize: 13,
    fontWeight: "800",
    color: APP_COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    marginTop: 12,
    fontSize: 34,
    fontWeight: "900",
    color: APP_COLORS.text,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: APP_COLORS.mutedText,
  },
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: APP_COLORS.text,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: APP_COLORS.mutedText,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    backgroundColor: APP_COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: APP_COLORS.primary,
  },
  form: {
    marginTop: 24,
    gap: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: APP_COLORS.text,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: APP_COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: APP_COLORS.divider,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  inputAction: {
    paddingLeft: 10,
    paddingVertical: 10,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: APP_COLORS.mutedText,
  },
  otpInput: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: APP_COLORS.divider,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 12,
    textAlign: "center",
    color: APP_COLORS.text,
  },
  errorBox: {
    backgroundColor: APP_COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: APP_COLORS.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  buttonEnabled: {
    backgroundColor: APP_COLORS.primary,
  },
  buttonDisabled: {
    backgroundColor: "#89B5EC",
  },
  buttonText: {
    color: APP_COLORS.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  linkText: {
    color: APP_COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  linkTextDisabled: {
    color: APP_COLORS.subtleText,
  },
  footerNote: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 13,
    color: APP_COLORS.mutedText,
  },
});
