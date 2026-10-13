import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-provider";
import { AppHeader } from "@/components/app-header";
import { LoadingScreen } from "@/components/loading-screen";
import { APP_COLORS } from "@/constants/theme";
import type { AppIconName } from "@/constants/theme";
import type { UserRole } from "@/types/auth";

type DashboardTab = {
  name: string;
  label: string;
  icon: AppIconName;
};

const DASHBOARD_TABS: Record<UserRole, DashboardTab[]> = {
  job_seeker: [
    {
      name: "index",
      label: "Dashboard",
      icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    },
    {
      name: "jobs",
      label: "Find jobs",
      icon: { ios: "magnifyingglass", android: "search", web: "search" },
    },
    {
      name: "applications",
      label: "Applications",
      icon: { ios: "doc.text", android: "description", web: "description" },
    },
    {
      name: "saved",
      label: "Saved",
      icon: {
        ios: "bookmark",
        android: "bookmark_border",
        web: "bookmark_border",
      },
    },
  ],
  recruiter: [
    {
      name: "recruiter-dashboard",
      label: "Dashboard",
      icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    },
    {
      name: "jobs",
      label: "My jobs",
      icon: { ios: "briefcase", android: "work", web: "work" },
    },
    {
      name: "candidates",
      label: "Candidates",
      icon: { ios: "person.2", android: "group", web: "group" },
    },
    {
      name: "interviews",
      label: "Interviews",
      icon: { ios: "calendar", android: "event", web: "event" },
    },
  ],
  admin: [
    {
      name: "admin/dashboard",
      label: "Dashboard",
      icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    },
    {
      name: "admin/users",
      label: "Users",
      icon: { ios: "person.2", android: "group", web: "group" },
    },
    {
      name: "admin/jobs",
      label: "Jobs",
      icon: { ios: "briefcase", android: "work", web: "work" },
    },
    {
      name: "admin/support",
      label: "Support",
      icon: { ios: "headset", android: "support_agent", web: "support_agent" },
    },
  ],
  support: [
    {
      name: "support/dashboard",
      label: "Dashboard",
      icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    },
    {
      name: "support/my-tickets",
      label: "My tickets",
      icon: {
        ios: "ticket",
        android: "confirmation_number",
        web: "confirmation_number",
      },
    },
    {
      name: "support/all-tickets",
      label: "All tickets",
      icon: { ios: "list.bullet", android: "list", web: "list" },
    },
    {
      name: "support/knowledge-base",
      label: "Knowledge",
      icon: { ios: "book", android: "menu_book", web: "menu_book" },
    },
  ],
};

function RoleTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      {state.routes.map(
        (route: (typeof state.routes)[number], index: number) => {
          const options = descriptors[route.key].options;
          const tab = DASHBOARD_TABS_BY_ROUTE[route.name];
          if (!tab || options.href === null) return null;

          const focused = state.index === index;
          const color = focused ? APP_COLORS.primary : APP_COLORS.subtleText;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={styles.tabItem}
            >
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <SymbolView
                  name={tab.icon}
                  size={20}
                  tintColor={color}
                  weight="thin"
                />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.tabLabel, focused && styles.tabLabelActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        },
      )}
    </View>
  );
}

const DASHBOARD_TABS_BY_ROUTE: Record<string, DashboardTab> = Object.values(
  DASHBOARD_TABS,
)
  .flat()
  .reduce<Record<string, DashboardTab>>((map, tab) => {
    map[tab.name] = tab;
    return map;
  }, {});

export default function AppLayout() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <Redirect href={"/(auth)/login" as never} />;
  }

  const tabs = DASHBOARD_TABS[currentUser.role];
  const visibleTabs = new Map(tabs.map((tab) => [tab.name, tab]));

  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} />}
      screenOptions={({ route }) => {
        const tab = visibleTabs.get(route.name);
        return {
          header: () => <AppHeader />,
          headerShown: true,
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: APP_COLORS.canvas },
          href: tab ? undefined : null,
          title: tab?.label,
          tabBarIcon: ({ color, size, focused }) =>
            tab ? (
              <SymbolView
                name={tab.icon}
                size={size}
                tintColor={color}
                weight={focused ? "regular" : "thin"}
              />
            ) : null,
        };
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: 62,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 6,
    paddingHorizontal: 8,
    backgroundColor: APP_COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: APP_COLORS.divider,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabIcon: {
    width: 32,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActive: {
    borderRadius: 10,
  },
  tabLabel: {
    maxWidth: "100%",
    color: APP_COLORS.subtleText,
    fontSize: 10,
    fontWeight: "400",
    textAlign: "center",
  },
  tabLabelActive: {
    color: APP_COLORS.primary,
  },
});
