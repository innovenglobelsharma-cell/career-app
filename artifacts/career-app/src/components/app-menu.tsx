import React, { useMemo, useState } from "react";
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
  size = 21,
  color = "#BDD1FF",
}: {
  name: AppIconName;
  size?: number;
  color?: string;
}) {
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.android, web: name.web }}
      size={size}
      tintColor={color}
    />
  );
}

export function AppMenuButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const modules = useMemo(
    () =>
      APP_MODULES.filter(
        (module) => currentUser?.role && module.roles.includes(currentUser.role),
      ),
    [currentUser?.role],
  );

  function closeMenu() {
    setIsOpen(false);
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

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
      >
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
      </Pressable>

      <Modal animationType="fade" transparent visible={isOpen} onRequestClose={closeMenu}>
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
                    {currentUser ? (ROLE_INITIALS[currentUser.role] ?? "C") : "C"}
                  </Text>
                </View>
                <View style={styles.userTextBlock}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {currentUser?.name ?? "Careerly"}
                  </Text>
                  <Text style={styles.userRole} numberOfLines={1}>
                    {currentUser ? (ROLE_LABEL[currentUser.role] ?? "User") : "Not signed in"}
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
                <SymbolIcon name={{ ios: "xmark.circle", android: "cancel", web: "cancel" }} size={24} color="#FFFFFF" />
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
                      color={isActive ? "#FFFFFF" : "#BDD1FF"}
                    />
                    <Text
                      style={[styles.navLabel, isActive && styles.navLabelActive]}
                      numberOfLines={1}
                    >
                      {module.label}
                    </Text>
                    {isActive && (
                      <SymbolIcon
                        name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
                        size={15}
                        color="#D6E4FF"
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                disabled={isLoggingOut}
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && !isLoggingOut && styles.logoutButtonPressed,
                  isLoggingOut && styles.logoutButtonDisabled,
                ]}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#D6E4FF" />
                ) : (
                  <>
                    <SymbolIcon
                      name={{ ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" }}
                      size={20}
                    />
                    <Text style={styles.logoutButtonText}>Sign out</Text>
                  </>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginLeft: -10,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  menuButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  menuLine: {
    width: 20,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    marginVertical: 2,
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
    backgroundColor: "rgba(15, 23, 42, 0.36)",
  },
  drawer: {
    width: 280,
    maxWidth: "86%",
    backgroundColor: APP_COLORS.header,
    borderRightWidth: 0,
  },
  header: {
    flexDirection: "column",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.14)",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingRight: 44,
  },
  logoContainer: {
    width: 36,
    height: 36,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  logoTextBlock: {
    marginLeft: 10,
  },
  companyName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  companySub: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D6E4FF",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    paddingLeft: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(143, 174, 255, 0.28)",
  },
  userAvatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#7A99E5",
  },
  userAvatarText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  userTextBlock: {
    flex: 1,
    paddingHorizontal: 10,
    minWidth: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  userRole: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#D6E4FF",
  },
  closeButton: {
    position: "absolute",
    right: 8,
    top: 9,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    zIndex: 5,
  },
  closeButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  navList: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    gap: 3,
  },
  navItem: {
    minHeight: 49,
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  navItemActive: {
    backgroundColor: "rgba(160, 191, 255, 0.36)",
  },
  navItemPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  navLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#D6E4FF",
  },
  navLabelActive: {
    color: "#FFFFFF",
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(24, 78, 201, 0.26)",
  },
  logoutButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "flex-start",
    flexDirection: "row",
    gap: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  logoutButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#BDD1FF",
  },
});
