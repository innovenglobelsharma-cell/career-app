import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const INTERVIEWS_ICON: AppIconName = {
  ios: "calendar",
  android: "event",
  web: "event",
};

export default function InterviewsScreen() {
  return (
    <PlaceholderScreen
      title="Interviews"
      subtitle="Schedule and track interviews with candidates. Interview management coming soon."
      icon={INTERVIEWS_ICON}
    />
  );
}
