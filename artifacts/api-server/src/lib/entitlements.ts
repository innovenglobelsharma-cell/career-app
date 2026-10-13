import { and, eq, gt, isNotNull, lte } from "drizzle-orm";
import { db, subscriptionPlanPrices, subscriptions } from "@workspace/db";
import { resolveEntitlements, resolvePlanEntitlements, type AccountRole, type AccountEntitlements } from "./business-rules";

export const getAccountEntitlements = async (
  userId: string,
  role: AccountRole,
): Promise<AccountEntitlements> => {
  const now = new Date();
  const [subscription] = await db.select({
    plan: subscriptions.plan,
  }).from(subscriptions).where(and(
    eq(subscriptions.userId, userId),
    eq(subscriptions.status, "active"),
    eq(subscriptions.paymentVerified, true),
    isNotNull(subscriptions.provider),
    isNotNull(subscriptions.providerPaymentId),
    lte(subscriptions.startsAt, now),
    gt(subscriptions.endsAt, now),
  )).limit(1);

  if (!subscription) return resolveEntitlements(role);
  const [plan] = await db.select({
    audience: subscriptionPlanPrices.audience,
    maxActiveJobs: subscriptionPlanPrices.maxActiveJobs,
    maxMonthlyApplications: subscriptionPlanPrices.maxMonthlyApplications,
    canFeatureJobs: subscriptionPlanPrices.canFeatureJobs,
  }).from(subscriptionPlanPrices).where(eq(subscriptionPlanPrices.plan, subscription.plan)).limit(1);

  return resolvePlanEntitlements(role, subscription.plan, plan);
};