import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const PLANS_ICON: AppIconName = {
  ios: "creditcard",
  android: "payment",
  web: "payment",
};

export default function AdminPlansScreen() {
  return (
    <PlaceholderScreen
      title="Plans & Payments"
      subtitle="Manage subscription plans, pricing, and billing. Admin plan management coming soon."
      icon={PLANS_ICON}
    />
  );
}
