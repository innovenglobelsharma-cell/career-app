import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const SUPPORT_DASH_ICON: AppIconName = {
  ios: "square.grid.2x2",
  android: "dashboard",
  web: "dashboard",
};

export default function SupportDashboardScreen() {
  return (
    <PlaceholderScreen
      title="Support Dashboard"
      subtitle="Support operations overview, ticket queue, and team metrics. Support workspace coming soon."
      icon={SUPPORT_DASH_ICON}
    />
  );
}
