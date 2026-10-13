import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const USERS_ICON: AppIconName = {
  ios: "person.2",
  android: "group",
  web: "group",
};

export default function AdminUsersScreen() {
  return (
    <PlaceholderScreen
      title="Users"
      subtitle="Manage all platform users, roles, and permissions. User management interface coming soon."
      icon={USERS_ICON}
    />
  );
}
