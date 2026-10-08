import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, AppIconName, MaxContentWidth } from "@/constants/theme";
import { APP_MODULES } from "@/constants/navigation";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const SETTINGS_ICON: AppIconName = { ios: "gearshape", android: "settings", web: "settings" };

export default function SettingsScreen() {
  const { currentUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [messagesEnabled, setMessagesEnabled] = useState(true);

  return (
    <PlaceholderScreen
      title="Settings"
      subtitle="Preferences and account controls"
      icon={SETTINGS_ICON}
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Job alerts</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ true: APP_COLORS.primary, false: APP_COLORS.divider }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Message alerts</Text>
          <Switch
            value={messagesEnabled}
            onValueChange={setMessagesEnabled}
            trackColor={{ true: APP_COLORS.primary, false: APP_COLORS.divider }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Account</Text>

        <Text style={styles.accountText}>
          Signed in as {currentUser?.email ?? "unknown"} ({currentUser?.role ?? "no role"})
        </Text>

        <Text style={styles.sectionTitle}>Workspace sections</Text>

        <View style={styles.moduleList}>
          {APP_MODULES.map((module) => (
            <View key={module.route} style={styles.moduleRow}>
              <Text style={styles.moduleDot}>•</Text>
              <Text style={styles.moduleLabel}>{module.label}</Text>
              <Text style={styles.moduleRoute}>{module.route}</Text>
            </View>
          ))}
        </View>
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: MaxContentWidth,
    marginTop: 24,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: APP_COLORS.mutedText,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: APP_COLORS.divider,
    marginVertical: 16,
  },
  accountText: {
    fontSize: 14,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  moduleList: {
    gap: 6,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moduleDot: {
    color: APP_COLORS.primary,
    fontSize: 14,
  },
  moduleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: APP_COLORS.text,
    flex: 1,
  },
  moduleRoute: {
    fontSize: 12,
    color: APP_COLORS.mutedText,
  },
});
