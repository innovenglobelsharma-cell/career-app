import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const ESCALATED_ICON: AppIconName = {
  ios: "exclamationmark.triangle",
  android: "warning",
  web: "warning",
};

export default function SupportEscalatedScreen() {
  return (
    <PlaceholderScreen
      title="Escalated Tickets"
      subtitle="High-priority escalated tickets requiring immediate attention. Escalation queue coming soon."
      icon={ESCALATED_ICON}
    />
  );
}
