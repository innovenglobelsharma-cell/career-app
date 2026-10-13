import React, { useMemo, useState } from "react";
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
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { ROLE_HOME_ROUTE } from "@/constants/roles";

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

// -----------------------------------------------------------------------------
// Reusable UI
// -----------------------------------------------------------------------------

function FieldIcon({ icon, color }: { icon: AppIconName; color: string }) {
  return (
    <View
      style={[
        styles.fieldIcon,
        {
          backgroundColor: `${color}16`,
        },
      ]}
    >
      <SymbolView
        name={{
          ios: icon.ios,
          android: icon.android,
          web: icon.web,
        }}
        size={17}
        tintColor={color}
      />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Screen
// -----------------------------------------------------------------------------

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;

    return email.trim().length > 0 && password.length > 0;
  }, [email, password, isSubmitting]);

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  async function handleSubmit() {
    setMessage(null);

    const parsed = credentialsSchema.safeParse({
      email: email.trim(),
      password,
    });

    if (!parsed.success) {
      setMessage(
        parsed.error.issues[0]?.message ?? "Please check your login details.",
      );
      return;
    }

    if (!hasApiBaseUrl()) {
      setMessage(
        "Missing API URL. Add EXPO_PUBLIC_API_URL to .env and restart Expo.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login(parsed.data);

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({
        ios: "padding",
        android: undefined,
      })}
      style={styles.container}
    >
      {/* Decorative background */}
      <View style={styles.backgroundShapeOne} />
      <View style={styles.backgroundShapeTwo} />
      <View style={styles.backgroundDotOne} />
      <View style={styles.backgroundDotTwo} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ----------------------------------------------------------------- */}
        {/* Brand Header */}
        {/* ----------------------------------------------------------------- */}

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Text style={styles.logoText}>C</Text>
              </View>
            </View>

            <View>
              <Text style={styles.brandName}>Careerly</Text>
              <Text style={styles.brandTagline}>YOUR GO TO JOB PLATFORM</Text>
            </View>
          </View>

          <View style={styles.welcomeRow}>
            <View style={styles.wavingHand}>
              <SymbolView
                name={{
                  ios: "hand.wave.fill",
                  android: "waving_hand",
                  web: "waving_hand",
                }}
                size={25}
                tintColor="#F59E0B"
                style={{ transform: [{ scaleX: -1 }] }}
              />
            </View>

            <View style={styles.welcomeTextContainer}>
              <Text style={styles.title}>Welcome back</Text>

              <Text style={styles.subtitle}>
                Sign in and pick up right where you left off.
              </Text>
            </View>
          </View>
        </View>

        {/* ----------------------------------------------------------------- */}
        {/* Main Card */}
        {/* ----------------------------------------------------------------- */}

        <View style={styles.cardShadow}>
          <View style={styles.card}>
            {/* Top accent */}
            <View style={styles.cardAccent}>
              <View style={styles.accentBlue} />
              <View style={styles.accentPurple} />
              <View style={styles.accentGreen} />
            </View>

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.stepIcon}>
                  <SymbolView
                    name={{
                      ios: "person.fill",
                      android: "person",
                      web: "person",
                    }}
                    size={19}
                    tintColor={APP_COLORS.primary}
                  />
                </View>

                <View>
                  <Text style={styles.cardTitle}>Sign in to your account</Text>

                  <Text style={styles.cardSubtitle}>
                    Enter your email and password below
                  </Text>
                </View>
              </View>

              <View style={styles.secureBadge}>
                <View style={styles.secureDot} />

                <Text style={styles.secureText}>SECURE</Text>
              </View>
            </View>

            {/* ------------------------------------------------------------- */}
            {/* Credentials */}
            {/* ------------------------------------------------------------- */}

            <View style={styles.form}>
              {/* Email */}
              <View>
                <Text style={styles.label}>Email address</Text>

                <View style={styles.inputRow}>
                  <FieldIcon
                    icon={{ ios: "envelope", android: "email", web: "email" }}
                    color="#4F7DF3"
                  />

                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor="#A1A8B5"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Password */}
              <View>
                <Text style={styles.label}>Password</Text>

                <View style={styles.inputRow}>
                  <FieldIcon
                    icon={{ ios: "lock", android: "lock", web: "lock" }}
                    color="#8B5CF6"
                  />

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    placeholder="Your password"
                    placeholderTextColor="#A1A8B5"
                    style={styles.input}
                  />

                  <Pressable
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    hitSlop={8}
                    style={styles.eyeButton}
                  >
                    <SymbolView
                      name={
                        isPasswordVisible
                          ? {
                              ios: "eye.slash",
                              android: "visibility_off",
                              web: "visibility_off",
                            }
                          : {
                              ios: "eye",
                              android: "visibility",
                              web: "visibility",
                            }
                      }
                      size={19}
                      tintColor="#7D8491"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Error */}
              {message && (
                <View style={styles.errorBox}>
                  <View style={styles.errorIcon}>
                    <Text style={styles.errorIconText}>!</Text>
                  </View>

                  <Text style={styles.errorText}>{message}</Text>
                </View>
              )}

              {/* Button */}
              <Pressable
                disabled={!canSubmit}
                onPress={handleSubmit}
                style={[
                  styles.button,
                  canSubmit ? styles.buttonEnabled : styles.buttonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign in</Text>

                    <View style={styles.buttonArrow}>
                      <Text style={styles.arrowText}>→</Text>
                    </View>
                  </>
                )}
              </Pressable>

              {/* Trust */}
              <View style={styles.trustRow}>
                <SymbolView
                  name={{
                    ios: "lock.fill",
                    android: "lock",
                    web: "lock",
                  }}
                  size={13}
                  tintColor="#7A8290"
                />

                <Text style={styles.trustText}>
                  Your information is encrypted and secure
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ----------------------------------------------------------------- */}
        {/* Footer */}
        {/* ----------------------------------------------------------------- */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>Don&apos;t have an account?</Text>

          <Text style={styles.footerLink}>Register from our web portal</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FC",
    paddingVertical: 25,
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 36,
  },

  // ---------------------------------------------------------------------------
  // Decorative Background
  // ---------------------------------------------------------------------------

  backgroundShapeOne: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#E7EEFF",
    top: -100,
    right: -90,
  },

  backgroundShapeTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#F0E9FF",
    bottom: -70,
    left: -80,
  },

  backgroundDotOne: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#B9D2FF",
    top: 150,
    left: 25,
  },

  backgroundDotTwo: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C9B6FF",
    bottom: 180,
    right: 30,
  },

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  header: {
    marginBottom: 24,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoOuter: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5EDFF",
    transform: [{ rotate: "-5deg" }],
  },

  logoInner: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: APP_COLORS.primary,
    transform: [{ rotate: "5deg" }],
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  brandName: {
    marginLeft: 12,
    color: "#1D2433",
    fontSize: 18,
    fontWeight: "900",
  },

  brandTagline: {
    marginLeft: 12,
    marginTop: 2,
    color: "#8992A2",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
  },

  wavingHand: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3D9",
  },

  wavingText: {
    fontSize: 25,
  },

  welcomeTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    color: "#1B2230",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 4,
    color: "#788292",
    fontSize: 14,
    lineHeight: 20,
  },

  // ---------------------------------------------------------------------------
  // Card
  // ---------------------------------------------------------------------------

  cardShadow: {
    borderRadius: 24,
    shadowColor: "#263B70",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 7,
  },

  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7EAF0",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },

  cardAccent: {
    flexDirection: "row",
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 4,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    overflow: "hidden",
  },

  accentBlue: {
    flex: 1,
    backgroundColor: "#4F7DF3",
  },

  accentPurple: {
    flex: 0.7,
    backgroundColor: "#8B5CF6",
  },

  accentGreen: {
    flex: 0.45,
    backgroundColor: "#10B981",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },

  cardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF3FF",
  },

  cardTitle: {
    marginLeft: 11,
    color: "#222938",
    fontSize: 17,
    fontWeight: "800",
  },

  cardSubtitle: {
    marginLeft: 11,
    marginTop: 2,
    color: "#8A92A0",
    fontSize: 12,
  },

  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
  },

  secureDot: {
    width: 6,
    height: 6,
    marginRight: 5,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },

  secureText: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  form: {
    gap: 10,
    marginTop: 25,
  },

  label: {
    marginBottom: 8,
    color: "#353C4A",
    fontSize: 13,
    fontWeight: "800",
  },

  inputRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E3E7EE",
    borderRadius: 14,
    backgroundColor: "#FAFBFD",
  },

  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 13,
    color: "#252B38",
    fontSize: 15,
  },

  eyeButton: {
    paddingHorizontal: 8,
    paddingVertical: 9,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },

  hint: {
    flex: 1,
    marginLeft: 6,
    color: "#818997",
    fontSize: 11.5,
    lineHeight: 17,
  },

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#F8D1D1",
    borderRadius: 13,
    backgroundColor: "#FFF5F5",
  },

  errorIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
  },

  errorIconText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  errorText: {
    flex: 1,
    marginLeft: 9,
    color: "#C63D3D",
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
  },

  // ---------------------------------------------------------------------------
  // Button
  // ---------------------------------------------------------------------------

  button: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },

  buttonEnabled: {
    backgroundColor: APP_COLORS.primary,
    shadowColor: APP_COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },

  buttonDisabled: {
    backgroundColor: "#AFC4E8",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  buttonArrow: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 9,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  arrowText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  // ---------------------------------------------------------------------------
  // Trust
  // ---------------------------------------------------------------------------

  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -3,
  },

  trustText: {
    marginLeft: 5,
    color: "#8B929E",
    fontSize: 10.5,
  },

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  footer: {
    alignItems: "center",
    marginTop: 22,
  },

  footerLine: {
    width: 36,
    height: 3,
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: "#DCE3F2",
  },

  footerText: {
    color: "#8A929F",
    fontSize: 11.5,
  },

  footerLink: {
    marginTop: 3,
    color: APP_COLORS.primary,
    fontSize: 11.5,
    fontWeight: "800",
  },
});
