import { APP_MODULES } from "@/constants/navigation";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const MODULES_BY_ROUTE: Record<string, (typeof APP_MODULES)[number]> = Object.fromEntries(
  APP_MODULES.map((module) => [module.route, module]),
);

export default function MessagesScreen() {
  const module = MODULES_BY_ROUTE["/(app)/messages"];

  return (
    <PlaceholderScreen
      title={module?.label ?? "Messages"}
      subtitle={module?.description}
      icon={module?.icon ?? { ios: "chat.bubble", android: "chat", web: "chat" }}
    />
  );
}
