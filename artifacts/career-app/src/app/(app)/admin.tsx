import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const ADMIN_ICON: AppIconName = {
  ios: "square.grid.2x2",
  android: "dashboard",
  web: "dashboard",
};

export default function AdminDashboardScreen() {
  return (
    <PlaceholderScreen
      title="Admin Dashboard"
      subtitle="Platform overview, user management, and system analytics. Full admin workspace coming soon."
      icon={ADMIN_ICON}
    />
  );
}
