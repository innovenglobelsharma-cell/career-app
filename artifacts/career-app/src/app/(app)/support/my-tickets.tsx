import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const MY_TICKETS_ICON: AppIconName = {
  ios: "list.bullet.rectangle",
  android: "assignment",
  web: "assignment",
};

export default function SupportMyTicketsScreen() {
  return (
    <PlaceholderScreen
      title="My Tickets"
      subtitle="Tickets assigned to you. Personal ticket queue coming soon."
      icon={MY_TICKETS_ICON}
    />
  );
}
