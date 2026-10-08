import { APP_MODULES } from "@/constants/navigation";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const MODULES_BY_ROUTE: Record<string, (typeof APP_MODULES)[number]> = Object.fromEntries(
  APP_MODULES.map((module) => [module.route, module]),
);

export default function JobsScreen() {
  const module = MODULES_BY_ROUTE["/(app)/jobs"];

  return (
    <PlaceholderScreen
      title={module?.label ?? "Find Jobs"}
      subtitle={module?.description}
      icon={module?.icon ?? { ios: "magnifyingglass", android: "search", web: "search" }}
    />
  );
}
