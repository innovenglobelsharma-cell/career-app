import React, { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/auth/auth-provider";

SplashScreen.preventAutoHideAsync();

function SplashGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </SplashGate>
    </AuthProvider>
  );
}
