import { APP_MODULES } from "@/constants/navigation";
import { PlaceholderScreen } from "@/components/placeholder-screen";

const MODULES_BY_ROUTE: Record<string, (typeof APP_MODULES)[number]> = Object.fromEntries(
  APP_MODULES.map((module) => [module.route, module]),
);

export default function SavedScreen() {
  const module = MODULES_BY_ROUTE["/(app)/saved"];

  return (
    <PlaceholderScreen
      title={module?.label ?? "Saved Jobs"}
      subtitle={module?.description}
      icon={module?.icon ?? { ios: "bookmark", android: "bookmark_border", web: "bookmark_border" }}
    />
  );
}
