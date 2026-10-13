import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { ROLE_INITIALS, ROLE_LABEL } from "@/constants/roles";
import { AppMenuButton } from "@/components/app-menu";

const NOTIFICATION_ICON: AppIconName = {
  ios: "bell",
  android: "notifications",
  web: "notifications",
};

const CHEVRON_DOWN_ICON: AppIconName = {
  ios: "chevron.down",
  android: "expand_more",
  web: "expand_more",
};

function SymbolIcon({
  name,
  size = 20,
  color = "#64748B",
  weight = "regular",
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  weight?: "regular" | "bold";
}) {
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.android, web: name.web }}
      size={size}
      tintColor={color}
      weight={weight}
    />
  );
}

const SCREEN_TITLES: Record<string, string> = {
  "/(app)": "Overview",
  "/(app)/recruiter-dashboard": "Dashboard",
  "/(app)/jobs": "Find Jobs",
  "/(app)/applications": "Applications",
  "/(app)/saved": "Saved Jobs",
  "/(app)/messages": "Messages",
  "/(app)/notifications": "Notifications",
  "/(app)/subscription": "Subscription",
  "/(app)/support": "Support",
  "/(app)/profile": "My Profile",
  "/(app)/settings": "Settings",
  "/(app)/candidates": "Candidates",
  "/(app)/interviews": "Interviews",
  "/(app)/company": "Company Profile",
  "/(app)/admin/dashboard": "Dashboard",
  "/(app)/admin/users": "Users",
  "/(app)/admin/recruiters": "Recruiters & Companies",
  "/(app)/admin/jobs": "Job Management",
  "/(app)/admin/applications": "Applications",
  "/(app)/admin/plans": "Plans & Payments",
  "/(app)/admin/support": "Support & Escalations",
  "/(app)/admin/reports": "Reports & Abuse",
  "/(app)/admin/analytics": "Analytics",
  "/(app)/admin/audit-logs": "Audit Logs",
  "/(app)/admin/settings": "Platform Settings",
  "/(app)/support/dashboard": "Dashboard",
  "/(app)/support/my-tickets": "My Tickets",
  "/(app)/support/all-tickets": "All Tickets",
  "/(app)/support/escalated": "Escalated Tickets",
  "/(app)/support/knowledge-base": "Knowledge Base",
  "/(app)/support/users": "User Directory",
  "/(app)/support/performance": "Performance",
};

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compactLayout = width < 900;
  const narrowLayout = width < 480;
  const { currentUser, logout } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = React.useState(false);

  const firstName = currentUser?.name?.trim().split(/\s+/)[0] || "there";
  const initials =
    currentUser?.name
      ?.trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "C";
  const roleLabel = currentUser
    ? (ROLE_LABEL[currentUser.role] ?? "User")
    : "User";
  const screenTitle = SCREEN_TITLES[pathname] || "Careerly";

  // Format date safely
  const formattedDate = (() => {
    try {
      const now = new Date();
      const weekday = now.toLocaleDateString(undefined, { weekday: "short" });
      const dayMonth = now.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      });
      return `${weekday}, ${dayMonth}`;
    } catch {
      return new Date().toLocaleDateString();
    }
  })();

  const handleLogout = async () => {
    setShowAccountMenu(false);
    try {
      await logout();
      router.replace("/(auth)/login" as never);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        {/* LEFT: Hamburger + Screen Title */}
        <View style={styles.leftSection}>
          <AppMenuButton />
          <Text style={styles.screenTitle} numberOfLines={1}>
            {screenTitle}
          </Text>
        </View>

        {/* CENTER: Date + Greeting */}
        {!compactLayout && (
          <View style={styles.centerSection}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <View style={styles.dividerDot} />
            <Text style={styles.greetingText}>Good morning, {firstName}</Text>
          </View>
        )}

        {/* RIGHT: Notification + Account */}
        <View style={styles.rightSection}>
          <Pressable
            onPress={() => router.push("/(app)/notifications" as never)}
            style={styles.iconButton}
            accessibilityLabel="Notifications"
          >
            <SymbolIcon
              name={NOTIFICATION_ICON}
              size={20}
              color="#64748B"
              weight="regular"
            />
          </Pressable>

          {!narrowLayout && <View style={styles.verticalDivider} />}

          <Pressable
            onPress={() => setShowAccountMenu(!showAccountMenu)}
            style={[
              styles.accountButton,
              narrowLayout && styles.compactAccountButton,
            ]}
            accessibilityLabel="Account menu"
          >
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>{initials}</Text>
            </View>
            {!narrowLayout && (
              <>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {currentUser?.name ?? "Careerly"}
                  </Text>
                  <Text style={styles.accountRole} numberOfLines={1}>
                    {roleLabel}
                  </Text>
                </View>
                <SymbolIcon
                  name={CHEVRON_DOWN_ICON}
                  size={18}
                  color="#94A3B8"
                  weight="bold"
                />
              </>
            )}
          </Pressable>

          {showAccountMenu && (
            <View style={styles.accountDropdown} pointerEvents="box-none">
              <Pressable
                onPress={() => {
                  router.push("/(app)/profile" as never);
                  setShowAccountMenu(false);
                }}
                style={styles.dropdownItem}
              >
                <SymbolIcon
                  name={{
                    ios: "person.crop.circle",
                    android: "account_circle",
                    web: "account_circle",
                  }}
                  size={18}
                  color="#64748B"
                />
                <Text style={styles.dropdownItemText}>Profile</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  router.push("/(app)/settings" as never);
                  setShowAccountMenu(false);
                }}
                style={styles.dropdownItem}
              >
                <SymbolIcon
                  name={{
                    ios: "gearshape",
                    android: "settings",
                    web: "settings",
                  }}
                  size={18}
                  color="#64748B"
                />
                <Text style={styles.dropdownItemText}>Settings</Text>
              </Pressable>
              <View style={styles.dropdownDivider} />
              <Pressable
                onPress={handleLogout}
                style={styles.dropdownItemDestructive}
              >
                <SymbolIcon
                  name={{
                    ios: "rectangle.portrait.and.arrow.right",
                    android: "logout",
                    web: "logout",
                  }}
                  size={18}
                  color="#EF4444"
                />
                <Text style={styles.dropdownItemTextDestructive}>Log out</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingHorizontal: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  centerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    justifyContent: "center",
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "ui-monospace" : "monospace",
  },
  dividerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: APP_COLORS.primary,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#475569",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
    flexShrink: 0,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },
  accountButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 140,
  },
  compactAccountButton: {
    minWidth: 0,
    paddingHorizontal: 0,
  },
  accountAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  accountAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    letterSpacing: 0.2,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  accountName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    letterSpacing: -0.1,
  },
  accountRole: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
    textTransform: "capitalize",
  },
  accountDropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    overflow: "hidden",
    minWidth: 180,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },
  dropdownItemDestructive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
  },
  dropdownItemTextDestructive: {
    fontSize: 14,
    fontWeight: "500",
    color: "#EF4444",
  },
});
