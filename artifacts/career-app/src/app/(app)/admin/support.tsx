import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const SUPPORT_ICON: AppIconName = {
  ios: "exclamationmark.triangle",
  android: "warning",
  web: "warning",
};

export default function AdminSupportScreen() {
  return (
    <PlaceholderScreen
      title="Support & Escalations"
      subtitle="Handle escalated support tickets and user issues. Escalation management coming soon."
      icon={SUPPORT_ICON}
    />
  );
}
