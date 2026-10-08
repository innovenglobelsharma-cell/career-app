import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, MaxContentWidth, AppIconName } from "@/constants/theme";
import { APP_MODULES } from "@/constants/navigation";
import { ROLE_LABEL } from "@/constants/roles";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const OVERVIEW_ICON: AppIconName = {
  ios: "square.grid.2x2",
  android: "dashboard",
  web: "dashboard",
};

function DashboardShortcut({ module }: { module: (typeof APP_MODULES)[number] }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(module.route as never)}
      style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
    >
      <View style={styles.shortcutIcon}>
        <SymbolView
          name={{ ios: module.icon.ios, android: module.icon.android, web: module.icon.web }}
          size={20}
          tintColor={APP_COLORS.primary}
        />
      </View>
      <Text style={styles.shortcutLabel} numberOfLines={1}>
        {module.label}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { currentUser } = useAuth();
  const shortcuts = APP_MODULES.filter((module) => module.route !== "/(app)");

  return (
    <PlaceholderScreen
      title={`Hello, ${currentUser?.name?.split(" ")[0] ?? "there"}`}
      subtitle={`Signed in as ${currentUser ? (ROLE_LABEL[currentUser.role] ?? "User") : "User"}. Your Careerly workspace is being built — pick a section below to explore.`}
      icon={OVERVIEW_ICON}
    >
      <View style={styles.grid}>
        {shortcuts.map((module) => (
          <DashboardShortcut key={module.route} module={module} />
        ))}
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    maxWidth: MaxContentWidth,
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  shortcut: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 16,
    gap: 12,
  },
  shortcutPressed: {
    backgroundColor: APP_COLORS.surfaceElevated,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: APP_COLORS.text,
  },
});
