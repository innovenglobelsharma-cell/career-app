import { APP_MODULES } from "@/constants/navigation";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const MODULES_BY_ROUTE: Record<string, (typeof APP_MODULES)[number]> =
  Object.fromEntries(APP_MODULES.map((module) => [module.route, module]));

export default function ApplicationsScreen() {
  const module = MODULES_BY_ROUTE["/(app)/applications"];

  return (
    <PlaceholderScreen
      title={module?.label ?? "Applications"}
      subtitle={module?.description}
      icon={
        module?.icon ?? {
          ios: "list.bullet.rectangle",
          android: "assignment",
          web: "assignment",
        }
      }
    />
  );
}
