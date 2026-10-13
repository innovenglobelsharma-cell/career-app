import { APP_MODULES } from "@/constants/navigation";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const MODULES_BY_ROUTE: Record<string, (typeof APP_MODULES)[number]> =
  Object.fromEntries(APP_MODULES.map((module) => [module.route, module]));

export default function SubscriptionScreen() {
  const module = MODULES_BY_ROUTE["/(app)/subscription"];

  return (
    <PlaceholderScreen
      title={module?.label ?? "Subscription"}
      subtitle={module?.description}
      icon={
        module?.icon ?? {
          ios: "crown",
          android: "workspace_premium",
          web: "workspace_premium",
        }
      }
    />
  );
}
