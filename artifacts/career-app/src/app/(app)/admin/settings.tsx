import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const SETTINGS_ICON: AppIconName = {
  ios: "gearshape",
  android: "settings",
  web: "settings",
};

export default function AdminSettingsScreen() {
  return (
    <PlaceholderScreen
      title="Platform Settings"
      subtitle="Configure platform-wide settings, integrations, and policies. Settings panel coming soon."
      icon={SETTINGS_ICON}
    />
  );
}
