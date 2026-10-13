import { Router, type IRouter } from "express";
import { and, asc, count, eq, gt, gte, lte } from "drizzle-orm";
import { applications, companies, db, jobs, subscriptionPlanPrices, subscriptions, users } from "@workspace/db";
import { getAccountEntitlements } from "../lib/entitlements";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
const isAdmin = (req: import("express").Request, res: import("express").Response) => {
  if (req.authUser?.role === "admin") return true;
  res.status(403).json({ error: "Administrator access required" });
  return false;
};
const planFields = {
  plan: subscriptionPlanPrices.plan,
  audience: subscriptionPlanPrices.audience,
  monthlyPrice: subscriptionPlanPrices.monthlyPrice,
  yearlyPrice: subscriptionPlanPrices.yearlyPrice,
  description: subscriptionPlanPrices.description,
  features: subscriptionPlanPrices.features,
  maxActiveJobs: subscriptionPlanPrices.maxActiveJobs,
  maxMonthlyApplications: subscriptionPlanPrices.maxMonthlyApplications,
  canFeatureJobs: subscriptionPlanPrices.canFeatureJobs,
  isActive: subscriptionPlanPrices.isActive,
};
const validPlanInput = (input: Record<string, unknown>) =>
  typeof input.plan === "string" && input.plan.trim().length > 0 && input.plan.trim().length <= 40
  && (input.audience === "recruiter" || input.audience === "job_seeker")
  && typeof input.description === "string" && input.description.trim().length <= 500
  && Array.isArray(input.features) && input.features.length <= 12
  && input.features.every((feature) => typeof feature === "string" && feature.trim().length > 0 && feature.trim().length <= 100)
  && typeof input.monthlyPrice === "number" && Number.isSafeInteger(input.monthlyPrice) && input.monthlyPrice >= 0 && input.monthlyPrice <= 10_000_000
  && typeof input.yearlyPrice === "number" && Number.isSafeInteger(input.yearlyPrice) && input.yearlyPrice >= 0 && input.yearlyPrice <= 10_000_000
  && (input.maxActiveJobs === null || (typeof input.maxActiveJobs === "number" && Number.isSafeInteger(input.maxActiveJobs) && input.maxActiveJobs > 0 && input.maxActiveJobs <= 1_000_000))
  && (input.maxMonthlyApplications === null || (typeof input.maxMonthlyApplications === "number" && Number.isSafeInteger(input.maxMonthlyApplications) && input.maxMonthlyApplications > 0 && input.maxMonthlyApplications <= 1_000_000))
  && typeof input.canFeatureJobs === "boolean"
  && typeof input.isActive === "boolean";

router.get("/subscriptions/me", requireAuth, async (req, res, next) => {
  try {
    const role = req.authUser!.role;
    if (role !== "job_seeker" && role !== "recruiter") {
      res.status(403).json({ error: "Subscription access is unavailable for this account" });
      return;
    }

    const entitlements = await getAccountEntitlements(req.authUser!.id, role);
    if (role === "recruiter") {
      const [company] = await db.select({ id: companies.id }).from(companies)
        .where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
      const [usage] = company
        ? await db.select({ activeJobs: count() }).from(jobs)
          .where(and(eq(jobs.companyId, company.id), eq(jobs.status, "active")))
        : [{ activeJobs: 0 }];
      res.json({
        plan: entitlements.plan,
        entitlements,
        usage: { activeJobs: usage.activeJobs },
      });
      return;
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [usage] = await db.select({ monthlyApplications: count() }).from(applications)
      .where(and(eq(applications.seekerId, req.authUser!.id), gte(applications.appliedAt, monthStart)));
    res.json({
      plan: entitlements.plan,
      entitlements,
      usage: { monthlyApplications: usage.monthlyApplications },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/subscription-prices", async (_req, res, next) => {
  try {
    const prices = await db.select(planFields).from(subscriptionPlanPrices)
      .where(eq(subscriptionPlanPrices.isActive, true))
      .orderBy(asc(subscriptionPlanPrices.audience), asc(subscriptionPlanPrices.plan));
    res.json({ prices });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/subscription-prices", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req, res)) return;
    const prices = await db.select(planFields).from(subscriptionPlanPrices)
      .orderBy(asc(subscriptionPlanPrices.audience), asc(subscriptionPlanPrices.plan));
    res.json({ prices });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/subscription-plans", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req, res)) return;
    const plans = await db.select(planFields).from(subscriptionPlanPrices)
      .orderBy(asc(subscriptionPlanPrices.audience), asc(subscriptionPlanPrices.plan));
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/subscription-plans", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req, res)) return;
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400).json({ error: "Enter a valid subscription plan" });
      return;
    }
    const input = req.body as Record<string, unknown>;
    if (!validPlanInput(input)) {
      res.status(400).json({ error: "Enter a valid plan name, audience, description, features, prices, and limits" });
      return;
    }
    const [plan] = await db.insert(subscriptionPlanPrices).values({
      plan: (input.plan as string).trim(),
      audience: input.audience as string,
      description: (input.description as string).trim(),
      features: (input.features as string[]).map((feature) => feature.trim()),
      monthlyPrice: input.monthlyPrice as number,
      yearlyPrice: input.yearlyPrice as number,
      maxActiveJobs: input.maxActiveJobs as number | null,
      maxMonthlyApplications: input.maxMonthlyApplications as number | null,
      canFeatureJobs: input.canFeatureJobs as boolean,
      isActive: input.isActive as boolean,
    }).returning(planFields);
    res.status(201).json({ plan });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "A plan with that name already exists" });
      return;
    }
    next(error);
  }
});

router.patch("/admin/subscription-plans/:plan", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req, res)) return;
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400).json({ error: "Enter a valid subscription plan" });
      return;
    }
    const input = req.body as Record<string, unknown>;
    if (!validPlanInput(input)) {
      res.status(400).json({ error: "Enter a valid plan name, audience, description, features, prices, and limits" });
      return;
    }
    const currentPlan = String(req.params.plan);
    const newPlan = (input.plan as string).trim();
    const updated = await db.transaction(async (transaction) => {
      const [existing] = await transaction.select({ audience: subscriptionPlanPrices.audience })
        .from(subscriptionPlanPrices).where(eq(subscriptionPlanPrices.plan, currentPlan)).for("update").limit(1);
      if (!existing) return { error: "not_found" as const };
      if (existing.audience !== input.audience) return { error: "audience_immutable" as const };
      const [plan] = await transaction.update(subscriptionPlanPrices).set({
        plan: newPlan,
        description: (input.description as string).trim(),
        features: (input.features as string[]).map((feature) => feature.trim()),
        monthlyPrice: input.monthlyPrice as number,
        yearlyPrice: input.yearlyPrice as number,
        maxActiveJobs: input.maxActiveJobs as number | null,
        maxMonthlyApplications: input.maxMonthlyApplications as number | null,
        canFeatureJobs: input.canFeatureJobs as boolean,
        isActive: input.isActive as boolean,
        updatedAt: new Date(),
      }).where(eq(subscriptionPlanPrices.plan, currentPlan)).returning(planFields);
      if (!plan) return { error: "not_found" as const };
      if (newPlan !== currentPlan) {
        await transaction.update(subscriptions).set({ plan: newPlan, updatedAt: new Date() })
          .where(eq(subscriptions.plan, currentPlan));
      }
      return { plan };
    });
    if ("error" in updated) {
      if (updated.error === "audience_immutable") {
        res.status(400).json({ error: "A plan's audience cannot be changed after creation" });
        return;
      }
      res.status(404).json({ error: "Subscription plan not found" });
      return;
    }
    res.json({ plan: updated.plan });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "A plan with that name already exists" });
      return;
    }
    next(error);
  }
});

router.patch("/admin/subscription-prices/:plan", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req, res)) return;
    const plan = String(req.params.plan || "");
    const monthlyPrice = req.body?.monthlyPrice;
    const yearlyPrice = req.body?.yearlyPrice;
    const allowedPlans = new Set(["Hiring Plus", "Hiring Pro", "Career Plus", "Career Pro"]);
    if (!allowedPlans.has(plan)
      || typeof monthlyPrice !== "number" || !Number.isSafeInteger(monthlyPrice) || monthlyPrice < 0 || monthlyPrice > 10_000_000
      || typeof yearlyPrice !== "number" || !Number.isSafeInteger(yearlyPrice) || yearlyPrice < 0 || yearlyPrice > 10_000_000) {
      res.status(400).json({ error: "Enter valid monthly and yearly prices for a paid plan" });
      return;
    }
    const [price] = await db.update(subscriptionPlanPrices)
      .set({ monthlyPrice, yearlyPrice, updatedAt: new Date() })
      .where(eq(subscriptionPlanPrices.plan, plan))
      .returning({
        plan: subscriptionPlanPrices.plan,
        audience: subscriptionPlanPrices.audience,
        monthlyPrice: subscriptionPlanPrices.monthlyPrice,
        yearlyPrice: subscriptionPlanPrices.yearlyPrice,
      });
    if (!price) {
      res.status(404).json({ error: "Subscription plan price not found" });
      return;
    }
    res.json({ price });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/company-subscriptions", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req, res)) return;
    const rows = await db.select({
      companyId: companies.id,
      companyName: companies.name,
      recruiterId: users.id,
      recruiterName: users.name,
      recruiterEmail: users.email,
      plan: subscriptions.plan,
      status: subscriptions.status,
      paymentVerified: subscriptions.paymentVerified,
      paymentProvider: subscriptions.provider,
      providerPaymentId: subscriptions.providerPaymentId,
      startsAt: subscriptions.startsAt,
      endsAt: subscriptions.endsAt,
    }).from(companies)
      .innerJoin(users, eq(companies.recruiterId, users.id))
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .orderBy(asc(companies.name));
    const usage = await db.select({ companyId: jobs.companyId, activeJobs: count() })
      .from(jobs).where(eq(jobs.status, "active")).groupBy(jobs.companyId);
    const usageByCompany = new Map(usage.map((row) => [row.companyId, row.activeJobs]));
    res.json({ companies: rows.map((row) => ({ ...row, activeJobs: usageByCompany.get(row.companyId) ?? 0 })) });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/company-subscriptions/:userId", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req, res)) return;
    const userId = String(req.params.userId);
    const endsAtValue = req.body?.endsAt;
    const endsAt = typeof endsAtValue === "string"
      ? /^\d{4}-\d{2}-\d{2}$/.test(endsAtValue)
        ? new Date(`${endsAtValue}T23:59:59.999Z`)
        : new Date(endsAtValue)
      : new Date(Number.NaN);
    if (Number.isNaN(endsAt.getTime())) {
      res.status(400).json({ error: "Enter a valid subscription end date" });
      return;
    }
    const [company] = await db.select({ id: companies.id }).from(companies)
      .where(eq(companies.recruiterId, userId)).limit(1);
    if (!company) {
      res.status(404).json({ error: "Company subscription not found" });
      return;
    }
    const updated = await db.transaction(async (transaction) => {
      const [existing] = await transaction.select({ startsAt: subscriptions.startsAt })
        .from(subscriptions).where(and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
          gt(subscriptions.endsAt, new Date()),
        )).for("update").limit(1);
      if (!existing) return { error: "No active company subscription is available to update" as const };
      if (endsAt <= existing.startsAt) return { error: "Subscription end date must be after its start date" as const };
      const [subscription] = await transaction.update(subscriptions)
        .set({ endsAt, updatedAt: new Date() })
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
        .returning({ endsAt: subscriptions.endsAt });
      return subscription ? { endsAt: subscription.endsAt } : { error: "No active company subscription is available to update" as const };
    });
    if ("error" in updated) {
      res.status(updated.error === "No active company subscription is available to update" ? 404 : 400)
        .json({ error: updated.error });
      return;
    }
    if (!updated) {
      res.status(404).json({ error: "No active company subscription is available to update" });
      return;
    }
    res.json({ endsAt: updated.endsAt });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/company-subscriptions/:userId/cancel", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req, res)) return;
    const userId = String(req.params.userId);
    const [company] = await db.select({ id: companies.id }).from(companies)
      .where(eq(companies.recruiterId, userId)).limit(1);
    if (!company) {
      res.status(404).json({ error: "Company subscription not found" });
      return;
    }
    const now = new Date();
    const [subscription] = await db.update(subscriptions)
      .set({ status: "canceled", updatedAt: now })
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        lte(subscriptions.startsAt, now),
        gt(subscriptions.endsAt, now),
      ))
      .returning({ userId: subscriptions.userId });
    if (!subscription) {
      res.status(404).json({ error: "No active company subscription is available to cancel" });
      return;
    }
    res.json({ canceled: true });
  } catch (error) {
    next(error);
  }
});

export default router;
