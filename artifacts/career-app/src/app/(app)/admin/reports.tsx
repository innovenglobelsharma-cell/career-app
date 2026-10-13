import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const REPORTS_ICON: AppIconName = {
  ios: "flag",
  android: "flag",
  web: "flag",
};

export default function AdminReportsScreen() {
  return (
    <PlaceholderScreen
      title="Reports & Abuse"
      subtitle="Review and action reported content and abuse cases. Moderation tools coming soon."
      icon={REPORTS_ICON}
    />
  );
}
