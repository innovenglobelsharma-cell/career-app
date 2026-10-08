import { APP_MODULES } from "@/constants/navigation";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const MODULES_BY_ROUTE: Record<string, (typeof APP_MODULES)[number]> = Object.fromEntries(
  APP_MODULES.map((module) => [module.route, module]),
);

export default function SupportScreen() {
  const module = MODULES_BY_ROUTE["/(app)/support"];

  return (
    <PlaceholderScreen
      title={module?.label ?? "Support"}
      subtitle={module?.description}
      icon={module?.icon ?? { ios: "headset", android: "support_agent", web: "support_agent" }}
    />
  );
}
