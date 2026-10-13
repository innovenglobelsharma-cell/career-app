import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const PERF_ICON: AppIconName = {
  ios: "chart.line.uptrend.xyaxis",
  android: "analytics",
  web: "analytics",
};

export default function SupportPerformanceScreen() {
  return (
    <PlaceholderScreen
      title="Performance"
      subtitle="Support team metrics, response times, and satisfaction scores. Performance analytics coming soon."
      icon={PERF_ICON}
    />
  );
}
