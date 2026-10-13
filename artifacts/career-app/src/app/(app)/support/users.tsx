import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const USERS_ICON: AppIconName = {
  ios: "person.2",
  android: "group",
  web: "group",
};

export default function SupportUsersScreen() {
  return (
    <PlaceholderScreen
      title="User Directory"
      subtitle="Browse and search platform users for support operations. User directory coming soon."
      icon={USERS_ICON}
    />
  );
}
