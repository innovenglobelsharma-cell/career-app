import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/auth/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";

export default function AuthLayout() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (currentUser) {
    return <Redirect href={"/(app)" as never} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
