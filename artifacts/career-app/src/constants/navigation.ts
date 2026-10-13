import type { UserRole } from "@/types/auth";
import type { AppIconName } from "@/constants/theme";

export type AppModule = {
  label: string;
  route: string;
  description: string;
  icon: AppIconName;
  roles: UserRole[];
};

export const JOB_SEEKER_MODULES: AppModule[] = [
  // Workspace group
  {
    label: "Overview",
    route: "/(app)",
    description: "Dashboard and quick stats",
    icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    roles: ["job_seeker"],
  },
  {
    label: "Find Jobs",
    route: "/(app)/jobs",
    description: "Search and browse open roles",
    icon: { ios: "magnifyingglass", android: "search", web: "search" },
    roles: ["job_seeker"],
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
    roles: ["job_seeker"],
  },
  {
    label: "Saved Jobs",
    route: "/(app)/saved",
    description: "Bookmark interesting roles",
    icon: {
      ios: "bookmark",
      android: "bookmark_border",
      web: "bookmark_border",
    },
    roles: ["job_seeker"],
  },
  // Your space group
  {
    label: "Messages",
    route: "/(app)/messages",
    description: "Chat with recruiters",
    icon: { ios: "message", android: "chat", web: "chat" },
    roles: ["job_seeker"],
  },
  {
    label: "Notifications",
    route: "/(app)/notifications",
    description: "Updates and alerts",
    icon: { ios: "bell", android: "notifications", web: "notifications" },
    roles: ["job_seeker"],
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
    roles: ["job_seeker"],
  },
  {
    label: "Support",
    route: "/(app)/support",
    description: "Help and tickets",
    icon: { ios: "headset", android: "support_agent", web: "support_agent" },
    roles: ["job_seeker"],
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
    roles: ["job_seeker"],
  },
  {
    label: "Settings",
    route: "/(app)/settings",
    description: "Preferences and sign out",
    icon: { ios: "gearshape", android: "settings", web: "settings" },
    roles: ["job_seeker"],
  },
];

export const RECRUITER_MODULES: AppModule[] = [
  {
    label: "Dashboard",
    route: "/(app)/recruiter-dashboard",
    description: "Overview and hiring activity",
    icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    roles: ["recruiter"],
  },
  {
    label: "My Jobs",
    route: "/(app)/jobs",
    description: "Manage your job postings",
    icon: { ios: "briefcase", android: "work", web: "work" },
    roles: ["recruiter"],
  },
  {
    label: "Candidates",
    route: "/(app)/candidates",
    description: "View and manage candidates",
    icon: { ios: "person.2", android: "group", web: "group" },
    roles: ["recruiter"],
  },
  {
    label: "Interviews",
    route: "/(app)/interviews",
    description: "Schedule and track interviews",
    icon: { ios: "calendar", android: "event", web: "event" },
    roles: ["recruiter"],
  },
  {
    label: "Messages",
    route: "/(app)/messages",
    description: "Chat with candidates",
    icon: { ios: "message", android: "chat", web: "chat" },
    roles: ["recruiter"],
  },
  {
    label: "Company Profile",
    route: "/(app)/company",
    description: "Manage company details",
    icon: { ios: "building.2", android: "business", web: "business" },
    roles: ["recruiter"],
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
    roles: ["recruiter"],
  },
  {
    label: "Support",
    route: "/(app)/support",
    description: "Help and tickets",
    icon: { ios: "headset", android: "support_agent", web: "support_agent" },
    roles: ["recruiter"],
  },
];

export const ADMIN_MODULES: AppModule[] = [
  {
    label: "Dashboard",
    route: "/(app)/admin/dashboard",
    description: "Platform overview and stats",
    icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    roles: ["admin"],
  },
  {
    label: "Users",
    route: "/(app)/admin/users",
    description: "Manage platform users",
    icon: { ios: "person.2", android: "group", web: "group" },
    roles: ["admin"],
  },
  {
    label: "Recruiters & Companies",
    route: "/(app)/admin/recruiters",
    description: "Manage recruiters and companies",
    icon: { ios: "building.2", android: "business", web: "business" },
    roles: ["admin"],
  },
  {
    label: "Job Management",
    route: "/(app)/admin/jobs",
    description: "Oversee all job postings",
    icon: { ios: "briefcase", android: "work", web: "work" },
    roles: ["admin"],
  },
  {
    label: "Applications",
    route: "/(app)/admin/applications",
    description: "View all applications",
    icon: {
      ios: "list.bullet.rectangle",
      android: "assignment",
      web: "assignment",
    },
    roles: ["admin"],
  },
  {
    label: "Plans & Payments",
    route: "/(app)/admin/plans",
    description: "Manage subscription plans and pricing",
    icon: { ios: "creditcard", android: "payment", web: "payment" },
    roles: ["admin"],
  },
  {
    label: "Support & Escalations",
    route: "/(app)/admin/support",
    description: "Handle escalated support tickets",
    icon: {
      ios: "exclamationmark.triangle",
      android: "warning",
      web: "warning",
    },
    roles: ["admin"],
  },
  {
    label: "Reports & Abuse",
    route: "/(app)/admin/reports",
    description: "Review reported content",
    icon: { ios: "flag", android: "flag", web: "flag" },
    roles: ["admin"],
  },
  {
    label: "Analytics",
    route: "/(app)/admin/analytics",
    description: "Platform analytics and insights",
    icon: {
      ios: "chart.line.uptrend.xyaxis",
      android: "analytics",
      web: "analytics",
    },
    roles: ["admin"],
  },
  {
    label: "Audit Logs",
    route: "/(app)/admin/audit-logs",
    description: "System audit trail",
    icon: { ios: "clock.arrow.circlepath", android: "history", web: "history" },
    roles: ["admin"],
  },
  {
    label: "Platform Settings",
    route: "/(app)/admin/settings",
    description: "Configure platform settings",
    icon: { ios: "gearshape", android: "settings", web: "settings" },
    roles: ["admin"],
  },
];

export const SUPPORT_MODULES: AppModule[] = [
  {
    label: "Dashboard",
    route: "/(app)/support/dashboard",
    description: "Support operations overview",
    icon: { ios: "square.grid.2x2", android: "dashboard", web: "dashboard" },
    roles: ["support"],
  },
  {
    label: "My Tickets",
    route: "/(app)/support/my-tickets",
    description: "Tickets assigned to you",
    icon: {
      ios: "list.bullet.rectangle",
      android: "assignment",
      web: "assignment",
    },
    roles: ["support"],
  },
  {
    label: "All Tickets",
    route: "/(app)/support/all-tickets",
    description: "View all support tickets",
    icon: { ios: "list.bullet", android: "list", web: "list" },
    roles: ["support"],
  },
  {
    label: "Escalated Tickets",
    route: "/(app)/support/escalated",
    description: "High priority escalated tickets",
    icon: {
      ios: "exclamationmark.triangle",
      android: "warning",
      web: "warning",
    },
    roles: ["support"],
  },
  {
    label: "Knowledge Base",
    route: "/(app)/support/knowledge-base",
    description: "Help articles and resources",
    icon: { ios: "book", android: "menu_book", web: "menu_book" },
    roles: ["support"],
  },
  {
    label: "User Directory",
    route: "/(app)/support/users",
    description: "Browse platform users",
    icon: { ios: "person.2", android: "group", web: "group" },
    roles: ["support"],
  },
  {
    label: "Performance",
    route: "/(app)/support/performance",
    description: "Support team metrics",
    icon: {
      ios: "chart.line.uptrend.xyaxis",
      android: "analytics",
      web: "analytics",
    },
    roles: ["support"],
  },
  {
    label: "Notifications",
    route: "/(app)/notifications",
    description: "Updates and alerts",
    icon: { ios: "bell", android: "notifications", web: "notifications" },
    roles: ["support"],
  },
  {
    label: "Profile & Settings",
    route: "/(app)/profile",
    description: "Account preferences",
    icon: {
      ios: "person.crop.circle",
      android: "account_circle",
      web: "account_circle",
    },
    roles: ["support"],
  },
];

export const MODULES_BY_ROLE: Record<UserRole, AppModule[]> = {
  job_seeker: JOB_SEEKER_MODULES,
  recruiter: RECRUITER_MODULES,
  admin: ADMIN_MODULES,
  support: SUPPORT_MODULES,
};

export const APP_MODULES: AppModule[] = [
  ...JOB_SEEKER_MODULES,
  ...RECRUITER_MODULES,
  ...ADMIN_MODULES,
  ...SUPPORT_MODULES,
];

export function getModulesForRole(role: UserRole): AppModule[] {
  return MODULES_BY_ROLE[role] ?? [];
}
