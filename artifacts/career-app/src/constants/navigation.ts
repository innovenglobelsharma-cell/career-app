import type { UserRole } from "@/types/auth";
import type { AppIconName } from "@/constants/theme";

export type AppModule = {
  label: string;
  route: string;
  description: string;
  icon: AppIconName;
  roles: UserRole[];
};

export const APP_MODULES: AppModule[] = [
  {
    label: "Overview",
    route: "/(app)",
    description: "Dashboard and quick stats",
    icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "Find Jobs",
    route: "/(app)/jobs",
    description: "Search and browse open roles",
    icon: { ios: "magnifyingglass", android: "search", web: "search" },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "Applications",
    route: "/(app)/applications",
    description: "Track your job applications",
    icon: {
      ios: "list.bullet.rectangle",
      android: "assignment",
      web: "assignment",
    },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "Saved Jobs",
    route: "/(app)/saved",
    description: "Bookmark interesting roles",
    icon: { ios: "bookmark", android: "bookmark_border", web: "bookmark_border" },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "Messages",
    route: "/(app)/messages",
    description: "Chat with recruiters",
    icon: { ios: "message", android: "chat", web: "chat" },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "Notifications",
    route: "/(app)/notifications",
    description: "Updates and alerts",
    icon: { ios: "bell", android: "notifications", web: "notifications" },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "Subscription",
    route: "/(app)/subscription",
    description: "Plans and billing",
    icon: {
      ios: "crown",
      android: "workspace_premium",
      web: "workspace_premium",
    },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "Support",
    route: "/(app)/support",
    description: "Help and tickets",
    icon: { ios: "headset", android: "support_agent", web: "support_agent" },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "My Profile",
    route: "/(app)/profile",
    description: "Account and resume details",
    icon: {
      ios: "person.crop.circle",
      android: "account_circle",
      web: "account_circle",
    },
    roles: ["job_seeker", "recruiter", "admin"],
  },
  {
    label: "Settings",
    route: "/(app)/settings",
    description: "Preferences and sign out",
    icon: { ios: "gearshape", android: "settings", web: "settings" },
    roles: ["job_seeker", "recruiter", "admin"],
  },
];
