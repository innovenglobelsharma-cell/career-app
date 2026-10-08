import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { companies, db, jobs } from "@workspace/db";
import { requireAuth, requireVerifiedRecruiter } from "../lib/auth";

const router: IRouter = Router();
const jobProjection = { id: jobs.id, title: jobs.title, category: jobs.category, location: jobs.location, mode: jobs.workMode, type: jobs.employmentType, experience: jobs.experience, salaryMin: jobs.salaryMin, salaryMax: jobs.salaryMax, description: jobs.description, skills: jobs.skills, status: jobs.status, placement: jobs.placement, createdAt: jobs.postedAt, companyId: companies.id, company: companies.name };
const normalizeSkills = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.map((skill) => String(skill).trim().slice(0, 60)).filter(Boolean))].slice(0, 30)
    : [];

router.get("/jobs", async (_req, res, next) => {
  try {
    const rows = await db.select(jobProjection).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.status, "active")).orderBy(desc(jobs.postedAt));
    res.json({ jobs: rows });
  } catch (error) { next(error); }
});

router.get("/jobs/mine", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "recruiter" && req.authUser!.role !== "admin") { res.status(403).json({ error: "Recruiter access required" }); return; }
    if (req.authUser!.role === "recruiter") {
      const [company] = await db.select({ verificationStatus: companies.verificationStatus }).from(companies)
        .where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
      if (company?.verificationStatus !== "verified") {
        res.status(403).json({ error: "Company verification is required before using recruiter tools" }); return;
      }
    }
    const rows = await db.select(jobProjection).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(req.authUser!.role === "admin" ? undefined : eq(companies.recruiterId, req.authUser!.id)).orderBy(desc(jobs.postedAt));
    res.json({ jobs: rows });
  } catch (error) { next(error); }
});

router.post("/jobs", requireAuth, requireVerifiedRecruiter, async (req, res, next) => {
  try {
    const [company] = await db.select().from(companies).where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
    if (!company) { res.status(409).json({ error: "Create a company profile before posting jobs" }); return; }
    const title = String(req.body?.title || "").trim().slice(0, 180);
    const location = String(req.body?.location || "").trim().slice(0, 140);
    const description = String(req.body?.description || "").trim().slice(0, 20_000);
    if (!title || !location || !description) { res.status(400).json({ error: "Title, location, and description are required" }); return; }
    const [created] = await db.insert(jobs).values({ companyId: company.id, title, category: String(req.body?.category || "Other").trim().slice(0, 80), location, description, workMode: String(req.body?.mode || "On-site").slice(0, 30), employmentType: String(req.body?.type || "Full-time").slice(0, 40), experience: String(req.body?.experience || "Not specified").slice(0, 80), skills: normalizeSkills(req.body?.skills), salaryMin: Number.isFinite(Number(req.body?.salaryMin)) ? Number(req.body.salaryMin) : null, salaryMax: Number.isFinite(Number(req.body?.salaryMax)) ? Number(req.body.salaryMax) : null, status: "pending" }).returning();
    res.status(201).json({ job: created });
  } catch (error) { next(error); }
});

router.patch("/jobs/:id", requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select({ job: jobs, recruiterId: companies.recruiterId, verificationStatus: companies.verificationStatus }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, String(req.params.id))).limit(1);
    const record = rows[0];
    if (!record) { res.status(404).json({ error: "Job not found" }); return; }
    if (req.authUser!.role !== "admin" && record.recruiterId !== req.authUser!.id) { res.status(403).json({ error: "You cannot update this job" }); return; }
    if (req.authUser!.role === "recruiter" && record.verificationStatus !== "verified") { res.status(403).json({ error: "Company verification is required before managing jobs" }); return; }
    const allowedStatus = ["draft", "pending", "active", "paused", "closed"] as const;
    const status = allowedStatus.includes(req.body?.status) ? req.body.status as typeof allowedStatus[number] : undefined;
    const [updated] = await db.update(jobs).set({ ...(status ? { status } : {}), ...(req.body?.placement === "featured" || req.body?.placement === "normal" ? { placement: req.body.placement } : {}), ...(typeof req.body?.title === "string" ? { title: req.body.title.trim().slice(0, 180) } : {}), ...(typeof req.body?.category === "string" ? { category: req.body.category.trim().slice(0, 80) || "Other" } : {}), ...(Array.isArray(req.body?.skills) ? { skills: normalizeSkills(req.body.skills) } : {}) }).where(and(eq(jobs.id, record.job.id))).returning();
    res.json({ job: updated });
  } catch (error) { next(error); }
});

router.delete("/jobs/:id", requireAuth, async (req, res, next) => {
  try {
    const [record] = await db.select({ id: jobs.id, recruiterId: companies.recruiterId, verificationStatus: companies.verificationStatus }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, String(req.params.id))).limit(1);
    if (!record) { res.status(404).json({ error: "Job not found" }); return; }
    if (req.authUser!.role !== "admin" && record.recruiterId !== req.authUser!.id) { res.status(403).json({ error: "You cannot delete this job" }); return; }
    if (req.authUser!.role === "recruiter" && record.verificationStatus !== "verified") { res.status(403).json({ error: "Company verification is required before managing jobs" }); return; }
    await db.delete(jobs).where(eq(jobs.id, record.id));
    res.status(204).end();
  } catch (error) {
    if ((error as { code?: string }).code === "23503") { res.status(409).json({ error: "A job with applications cannot be deleted; close it instead" }); return; }
    next(error);
  }
});

export default router;
