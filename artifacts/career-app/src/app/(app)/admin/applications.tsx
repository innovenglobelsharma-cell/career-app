import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const APPLICATIONS_ICON: AppIconName = {
  ios: "list.bullet.rectangle",
  android: "assignment",
  web: "assignment",
};

export default function AdminApplicationsScreen() {
  return (
    <PlaceholderScreen
      title="Applications"
      subtitle="View and manage all applications across the platform. Coming soon."
      icon={APPLICATIONS_ICON}
    />
  );
}
