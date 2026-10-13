import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const JOBS_ICON: AppIconName = {
  ios: "briefcase",
  android: "work",
  web: "work",
};

export default function AdminJobsScreen() {
  return (
    <PlaceholderScreen
      title="Job Management"
      subtitle="Oversee all job postings, moderation, and platform-wide job settings. Coming soon."
      icon={JOBS_ICON}
    />
  );
}
