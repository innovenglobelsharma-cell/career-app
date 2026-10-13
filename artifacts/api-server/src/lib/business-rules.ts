export type AccountRole = "job_seeker" | "recruiter";

export type AccountEntitlements = {
  plan: string;
  maxActiveJobs: number | null;
  canFeatureJobs: boolean;
  monthlyApplications: number | null;
};

export type PlanEntitlementConfig = {
  audience: string;
  maxActiveJobs: number | null;
  maxMonthlyApplications: number | null;
  canFeatureJobs: boolean;
};

const jobTransitions: Record<string, readonly string[]> = {
  draft: ["pending", "closed"],
  pending: ["draft", "closed", "active"],
  active: ["paused", "closed"],
  paused: ["pending", "closed", "active"],
  closed: ["draft", "pending"],
};

const recruiterApplicationTransitions: Record<string, readonly string[]> = {
  applied: ["viewed", "rejected"],
  viewed: ["shortlisted", "interview", "rejected"],
  shortlisted: ["interview", "rejected"],
  interview: ["selected", "rejected"],
  selected: [],
  rejected: [],
  withdrawn: [],
};

const seekerWithdrawableStatuses = new Set(["applied", "viewed", "shortlisted", "interview"]);

export const resolveEntitlements = (
  role: AccountRole,
  verifiedPlan: string | null = null,
): AccountEntitlements => {
  if (role === "recruiter" && verifiedPlan === "Hiring Plus") {
    return { plan: verifiedPlan, maxActiveJobs: 10, canFeatureJobs: true, monthlyApplications: null };
  }
  if (role === "recruiter" && verifiedPlan === "Hiring Pro") {
    return { plan: verifiedPlan, maxActiveJobs: null, canFeatureJobs: false, monthlyApplications: null };
  }
  if (role === "job_seeker" && verifiedPlan === "Career Plus") {
    return { plan: verifiedPlan, maxActiveJobs: null, canFeatureJobs: false, monthlyApplications: null };
  }
  if (role === "job_seeker" && verifiedPlan === "Career Pro") {
    return { plan: verifiedPlan, maxActiveJobs: null, canFeatureJobs: false, monthlyApplications: null };
  }
  return {
    plan: "Free",
    maxActiveJobs: role === "recruiter" ? 1 : null,
    canFeatureJobs: false,
    monthlyApplications: role === "job_seeker" ? 5 : null,
  };
};

export const resolvePlanEntitlements = (
  role: AccountRole,
  verifiedPlan: string,
  config: PlanEntitlementConfig | undefined,
): AccountEntitlements => {
  if (config?.audience === role) {
    return {
      plan: verifiedPlan,
      maxActiveJobs: role === "recruiter" ? config.maxActiveJobs : null,
      canFeatureJobs: role === "recruiter" && config.canFeatureJobs,
      monthlyApplications: role === "job_seeker" ? config.maxMonthlyApplications : null,
    };
  }
  return resolveEntitlements(role, verifiedPlan);
};

export const canTransitionJob = (current: string, next: string, role: string): boolean => {
  if (current === next) return true;
  if (!jobTransitions[current]?.includes(next)) return false;
  return next !== "active" || role === "admin";
};

export const canTransitionApplication = (current: string, next: string, role: string): boolean => {
  if (current === next) return true;
  if (role === "job_seeker") return next === "withdrawn" && seekerWithdrawableStatuses.has(current);
  return ["admin", "recruiter"].includes(role)
    && Boolean(recruiterApplicationTransitions[current]?.includes(next));
};