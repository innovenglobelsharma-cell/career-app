import { APP_MODULES } from "@/constants/navigation";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const MODULES_BY_ROUTE: Record<string, (typeof APP_MODULES)[number]> =
  Object.fromEntries(APP_MODULES.map((module) => [module.route, module]));

export default function NotificationsScreen() {
  const module = MODULES_BY_ROUTE["/(app)/notifications"];

  return (
    <PlaceholderScreen
      title={module?.label ?? "Notifications"}
      subtitle={module?.description}
      icon={
        module?.icon ?? {
          ios: "bell",
          android: "notifications",
          web: "notifications",
        }
      }
    />
  );
}
