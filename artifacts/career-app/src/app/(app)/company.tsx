import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const COMPANY_ICON: AppIconName = {
  ios: "building.2",
  android: "business",
  web: "business",
};

export default function CompanyScreen() {
  return (
    <PlaceholderScreen
      title="Company Profile"
      subtitle="Manage your company details, branding, and verification. Company settings coming soon."
      icon={COMPANY_ICON}
    />
  );
}
