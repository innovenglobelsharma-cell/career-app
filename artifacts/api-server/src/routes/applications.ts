import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { applications, companies, db, jobs, users } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/applications", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === "recruiter") {
      const [company] = await db.select({ verificationStatus: companies.verificationStatus }).from(companies)
        .where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
      if (company?.verificationStatus !== "verified") {
        res.status(403).json({ error: "Company verification is required before reviewing applications" }); return;
      }
    }
    const base = db.select({ id: applications.id, jobId: jobs.id, jobTitle: jobs.title, company: companies.name, seekerId: users.id, applicantName: users.name, applicantEmail: users.email, applicantPhone: users.phoneNumber, applicantProfile: users.profileData, status: applications.status, coverNote: applications.coverNote, appliedAt: applications.appliedAt, recruiterId: companies.recruiterId })
      .from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).innerJoin(companies, eq(jobs.companyId, companies.id)).innerJoin(users, eq(applications.seekerId, users.id));
    const rows = req.authUser!.role === "job_seeker"
      ? await base.where(eq(applications.seekerId, req.authUser!.id)).orderBy(desc(applications.appliedAt))
      : req.authUser!.role === "recruiter"
        ? await base.where(eq(companies.recruiterId, req.authUser!.id)).orderBy(desc(applications.appliedAt))
        : await base.orderBy(desc(applications.appliedAt));
    res.json({ applications: rows.map(({ recruiterId: _recruiterId, applicantProfile, applicantPhone, ...application }) => {
      const canViewProfile = (req.authUser!.role === "job_seeker" && application.seekerId === req.authUser!.id)
        || (req.authUser!.role === "recruiter" && applicantProfile?.contactVisibility === "recruiters");
      return {
        ...application,
        applicantEmail: canViewProfile ? application.applicantEmail : null,
        applicantPhone: canViewProfile ? applicantPhone : null,
        applicantProfile: canViewProfile ? applicantProfile : null,
      };
    }) });
  } catch (error) { next(error); }
});

router.post("/applications", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "job_seeker") { res.status(403).json({ error: "Job-seeker access required" }); return; }
    const jobId = String(req.body?.jobId || "");
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.status, "active"))).limit(1);
    if (!job) { res.status(404).json({ error: "Active job not found" }); return; }
    const [created] = await db.insert(applications).values({ jobId, seekerId: req.authUser!.id, coverNote: String(req.body?.coverNote || "").trim().slice(0, 5_000) || null }).returning();
    res.status(201).json({ application: created });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") { res.status(409).json({ error: "You already applied for this job" }); return; }
    next(error);
  }
});

router.patch("/applications/:id", requireAuth, async (req, res, next) => {
  try {
    const allowed = ["applied", "viewed", "shortlisted", "interview", "selected", "rejected", "withdrawn"] as const;
    if (!allowed.includes(req.body?.status)) { res.status(400).json({ error: "Invalid application status" }); return; }
    const [record] = await db.select({ application: applications, recruiterId: companies.recruiterId, verificationStatus: companies.verificationStatus }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(applications.id, String(req.params.id))).limit(1);
    if (!record) { res.status(404).json({ error: "Application not found" }); return; }
    const canUpdate = req.authUser!.role === "admin" || (req.authUser!.role === "recruiter" && record.recruiterId === req.authUser!.id) || (req.authUser!.role === "job_seeker" && record.application.seekerId === req.authUser!.id && req.body.status === "withdrawn");
    if (!canUpdate) { res.status(403).json({ error: "You cannot update this application" }); return; }
    if (req.authUser!.role === "recruiter" && record.verificationStatus !== "verified") { res.status(403).json({ error: "Company verification is required before managing applications" }); return; }
    const [updated] = await db.update(applications).set({ status: req.body.status }).where(eq(applications.id, record.application.id)).returning();
    res.json({ application: updated });
  } catch (error) { next(error); }
});

export default router;
