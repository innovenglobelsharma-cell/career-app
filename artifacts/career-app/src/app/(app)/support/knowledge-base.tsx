import React from "react";
import { APP_COLORS, AppIconName } from "@/constants/theme";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const KB_ICON: AppIconName = {
  ios: "book",
  android: "menu_book",
  web: "menu_book",
};

export default function SupportKnowledgeBaseScreen() {
  return (
    <PlaceholderScreen
      title="Knowledge Base"
      subtitle="Help articles, FAQs, and self-service resources. Knowledge base editor coming soon."
      icon={KB_ICON}
    />
  );
}
