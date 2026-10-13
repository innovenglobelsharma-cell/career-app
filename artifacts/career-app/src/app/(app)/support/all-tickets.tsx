import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const ALL_TICKETS_ICON: AppIconName = {
  ios: "list.bullet",
  android: "list",
  web: "list",
};

export default function SupportAllTicketsScreen() {
  return (
    <PlaceholderScreen
      title="All Tickets"
      subtitle="View and manage all support tickets across the platform. Ticket management coming soon."
      icon={ALL_TICKETS_ICON}
    />
  );
}
