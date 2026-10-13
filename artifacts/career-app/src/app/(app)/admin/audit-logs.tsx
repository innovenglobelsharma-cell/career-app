import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const AUDIT_ICON: AppIconName = {
  ios: "clock.arrow.circlepath",
  android: "history",
  web: "history",
};

export default function AdminAuditLogsScreen() {
  return (
    <PlaceholderScreen
      title="Audit Logs"
      subtitle="System audit trail and security logs. Audit log viewer coming soon."
      icon={AUDIT_ICON}
    />
  );
}
