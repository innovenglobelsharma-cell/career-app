import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/auth/auth-provider";
import { AppMenuButton } from "@/components/app-menu";
import { LoadingScreen } from "@/components/loading-screen";
import { APP_COLORS } from "@/constants/theme";

export default function AppLayout() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <Redirect href={"/(auth)/login" as never} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: APP_COLORS.header },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { color: "#FFFFFF", fontWeight: "700" },
        headerShadowVisible: false,
        headerLeft: () => <AppMenuButton />,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: APP_COLORS.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Overview" }} />
      <Stack.Screen name="jobs" options={{ title: "Find Jobs" }} />
      <Stack.Screen name="applications" options={{ title: "Applications" }} />
      <Stack.Screen name="saved" options={{ title: "Saved Jobs" }} />
      <Stack.Screen name="messages" options={{ title: "Messages" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="subscription" options={{ title: "Subscription" }} />
      <Stack.Screen name="support" options={{ title: "Support" }} />
      <Stack.Screen name="profile" options={{ title: "My Profile" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
