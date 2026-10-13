import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { APP_MODULES } from "@/constants/navigation";
import { ROLE_INITIALS, ROLE_LABEL } from "@/constants/roles";

function SymbolIcon({
  name,
  size = 20,
  color = "#94A3B8",
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

export function AppMenuButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<View>(null);
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const modules = useMemo(
    () =>
      APP_MODULES.filter(
        (module) =>
          currentUser?.role && module.roles.includes(currentUser.role),
      ),
    [currentUser?.role],
  );

  function closeMenu() {
    setIsOpen(false);
    setShowDropdown(false);
  }

  function handleNavigate(route: string) {
    closeMenu();
    router.push(route as never);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      closeMenu();
      router.replace("/(auth)/login" as never);
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleProfilePress() {
    setShowDropdown(false);
    router.push("/(app)/profile" as never);
  }

  function handleSettingsPress() {
    setShowDropdown(false);
    router.push("/(app)/settings" as never);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.menuButton,
          pressed && styles.menuButtonPressed,
        ]}
      >
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={isOpen}
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeMenu} />
          <SafeAreaView style={styles.drawer}>
            <View style={styles.header}>
              <View style={styles.logoRow}>
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>C</Text>
                </View>
                <View style={styles.logoTextBlock}>
                  <Text style={styles.companyName}>Careerly</Text>
                  <Text style={styles.companySub}>Job Marketplace</Text>
                </View>
              </View>

              <View style={styles.userSection}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {currentUser
                      ? (ROLE_INITIALS[currentUser.role] ?? "C")
                      : "C"}
                  </Text>
                </View>
                <View style={styles.userTextBlock}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {currentUser?.name ?? "Careerly"}
                  </Text>
                  <Text style={styles.userRole} numberOfLines={1}>
                    {currentUser
                      ? (ROLE_LABEL[currentUser.role] ?? "User")
                      : "Not signed in"}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
                onPress={closeMenu}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <SymbolIcon
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  size={22}
                  color="#94A3B8"
                  weight="bold"
                />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.navList}
              showsVerticalScrollIndicator={false}
            >
              {modules.map((module) => {
                const isActive =
                  module.route === "/(app)"
                    ? pathname === "/(app)"
                    : pathname === module.route ||
                      pathname.startsWith(module.route);

                return (
                  <Pressable
                    key={module.route}
                    accessibilityRole="button"
                    onPress={() => handleNavigate(module.route)}
                    style={({ pressed }) => [
                      styles.navItem,
                      isActive && styles.navItemActive,
                      pressed && styles.navItemPressed,
                    ]}
                  >
                    <SymbolIcon
                      name={module.icon}
                      size={20}
                      color={isActive ? "#FFFFFF" : "#94A3B8"}
                      weight={isActive ? "bold" : "regular"}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        isActive && styles.navLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {module.label}
                    </Text>
                    {isActive && (
                      <SymbolIcon
                        name={{
                          ios: "chevron.right",
                          android: "chevron_right",
                          web: "chevron_right",
                        }}
                        size={14}
                        color="#64748B"
                        weight="bold"
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.footer}>
              <View ref={dropdownRef} style={styles.dropdownWrapper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Account options"
                  onPress={() => setShowDropdown((prev) => !prev)}
                  style={styles.dropdownTrigger}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {currentUser
                        ? (ROLE_INITIALS[currentUser.role] ?? "C")
                        : "C"}
                    </Text>
                  </View>
                  <View style={styles.userTextBlock}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {currentUser?.name ?? "Careerly"}
                    </Text>
                    <Text style={styles.userRole} numberOfLines={1}>
                      {currentUser
                        ? (ROLE_LABEL[currentUser.role] ?? "User")
                        : "Not signed in"}
                    </Text>
                  </View>
                  <SymbolIcon
                    name={
                      showDropdown
                        ? {
                            ios: "chevron.up",
                            android: "expand_less",
                            web: "expand_less",
                          }
                        : {
                            ios: "chevron.down",
                            android: "expand_more",
                            web: "expand_more",
                          }
                    }
                    size={18}
                    color="#64748B"
                    weight="bold"
                  />
                </Pressable>

                {showDropdown && (
                  <View style={styles.dropdownMenu} pointerEvents="box-none">
                    <Pressable
                      onPress={handleProfilePress}
                      style={styles.dropdownItem}
                      accessibilityRole="menuitem"
                    >
                      <SymbolIcon
                        name={{
                          ios: "person.crop.circle",
                          android: "account_circle",
                          web: "account_circle",
                        }}
                        size={18}
                        color="#94A3B8"
                      />
                      <Text style={styles.dropdownItemText}>Profile</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSettingsPress}
                      style={styles.dropdownItem}
                      accessibilityRole="menuitem"
                    >
                      <SymbolIcon
                        name={{
                          ios: "gearshape",
                          android: "settings",
                          web: "settings",
                        }}
                        size={18}
                        color="#94A3B8"
                      />
                      <Text style={styles.dropdownItemText}>Settings</Text>
                    </Pressable>
                    <View style={styles.dropdownDivider} />
                    <Pressable
                      accessibilityRole="menuitem"
                      onPress={handleLogout}
                      disabled={isLoggingOut}
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
                      <Text style={styles.dropdownItemTextDestructive}>
                        Log out
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  menuButtonPressed: {
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  menuLine: {
    width: 22,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#0F172A",
    marginVertical: 3,
  },
  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  drawer: {
    width: 280,
    maxWidth: "88%",
    backgroundColor: "#0B1F44",
  },
  header: {
    flexDirection: "column",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  logoTextBlock: {
    marginLeft: 12,
  },
  companyName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  companySub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
  },
  userAvatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(37, 99, 235, 0.2)",
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#93C5FD",
  },
  userTextBlock: {
    flex: 1,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F1F5F9",
    letterSpacing: -0.2,
  },
  userRole: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "capitalize",
  },
  closeButton: {
    position: "absolute",
    right: 4,
    top: 12,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  closeButtonPressed: {
    backgroundColor: "rgba(148, 163, 184, 0.1)",
  },
  navList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  navItem: {
    minHeight: 48,
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  navItemActive: {
    backgroundColor: "rgba(37, 99, 235, 0.15)",
  },
  navItemPressed: {
    backgroundColor: "rgba(148, 163, 184, 0.08)",
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#CBD5E1",
    letterSpacing: -0.1,
  },
  navLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
    backgroundColor: "rgba(15, 23, 42, 0.3)",
  },
  dropdownWrapper: {
    position: "relative",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  dropdownMenu: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    marginVertical: 6,
  },
  dropdownItemDestructive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F1F5F9",
  },
  dropdownItemTextDestructive: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FCA5A5",
  },
});
