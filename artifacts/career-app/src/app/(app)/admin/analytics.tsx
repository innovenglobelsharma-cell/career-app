import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const ANALYTICS_ICON: AppIconName = {
  ios: "chart.line.uptrend.xyaxis",
  android: "analytics",
  web: "analytics",
};

export default function AdminAnalyticsScreen() {
  return (
    <PlaceholderScreen
      title="Analytics"
      subtitle="Platform analytics, insights, and reporting dashboards. Analytics workspace coming soon."
      icon={ANALYTICS_ICON}
    />
  );
}
