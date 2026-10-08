import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";

import { APP_COLORS, AppIconName, MaxContentWidth } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
  icon: AppIconName;
  children?: React.ReactNode;
};

/**
 * Generic placeholder used by the not-yet-built Careerly screens.
 * Swap this out with the real screen content as features land.
 */
export function PlaceholderScreen({
  title,
  subtitle,
  icon,
  children,
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <SymbolView
              name={{ ios: icon.ios, android: icon.android, web: icon.web }}
              size={40}
              tintColor={APP_COLORS.primary}
            />
          </View>

          <Text style={styles.title}>{title}</Text>

          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : (
            <Text style={styles.subtitle}>
              This screen is a placeholder. The {title.toLowerCase()} experience
              is coming soon.
            </Text>
          )}

          <View style={styles.badge}>
            <Text style={styles.badgeText}>COMING SOON</Text>
          </View>
        </View>

        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: APP_COLORS.canvas,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  container: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: APP_COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: APP_COLORS.mutedText,
    textAlign: "center",
  },
  badge: {
    marginTop: 20,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: APP_COLORS.primary,
  },
});
