import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const RECRUITERS_ICON: AppIconName = {
  ios: "building.2",
  android: "business",
  web: "business",
};

export default function AdminRecruitersScreen() {
  return (
    <PlaceholderScreen
      title="Recruiters & Companies"
      subtitle="Manage recruiter accounts, company profiles, and verification status. Coming soon."
      icon={RECRUITERS_ICON}
    />
  );
}
