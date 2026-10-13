import { Router, type IRouter } from "express";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { applications, companies, db, jobPostingDrafts, jobPostingFeedback, jobs, users } from "@workspace/db";
import { requireAuth, requireVerifiedRecruiter } from "../lib/auth";
import { getAccountEntitlements } from "../lib/entitlements";
import { canTransitionJob } from "../lib/business-rules";

const router: IRouter = Router();
const jobProjection = { id: jobs.id, title: jobs.title, category: jobs.category, location: jobs.location, mode: jobs.workMode, type: jobs.employmentType, experience: jobs.experience, salaryMin: jobs.salaryMin, salaryMax: jobs.salaryMax, description: jobs.description, details: jobs.details, skills: jobs.skills, status: jobs.status, placement: jobs.placement, views: jobs.views, createdAt: jobs.postedAt, companyId: companies.id, company: companies.name };
const normalizeSkills = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.map((skill) => String(skill).trim().slice(0, 60)).filter(Boolean))].slice(0, 30)
    : [];
const normalizeDetails = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 100_000) return null;
  return value as Record<string, unknown>;
};
const matchingTerms = (values: unknown[]) => new Set(
  values.flatMap((value) => typeof value === "string" ? value.toLowerCase().match(/[a-z0-9+#.]+/g) || [] : [])
    .filter((term) => term.length > 1 && !["and", "for", "the", "with", "years", "year"].includes(term)),
);
const candidateMatchScore = (
  job: { title: string; category: string; skills: string[] },
  profile: NonNullable<typeof users.$inferSelect.profileData>,
) => {
  const roleTerms = matchingTerms([job.title, job.category]);
  const skillTerms = matchingTerms(job.skills);
  const roleTermsProfile = matchingTerms([
    profile.headline,
    profile.careerProfile?.jobRole,
    profile.careerProfile?.roleCategory,
    profile.careerProfile?.department,
    ...(profile.careerProfile?.preferredRoles || []),
    ...(profile.experiences || []).map((experience) => experience.role),
  ]);
  const skillTermsProfile = matchingTerms([
    ...(profile.strengths || []),
    ...(profile.experiences || []).flatMap((experience) => [experience.role, experience.description || ""]),
  ]);
  const roleOverlap = [...roleTerms].filter((term) => roleTermsProfile.has(term)).length;
  const skillOverlap = [...skillTerms].filter((term) => skillTermsProfile.has(term)).length;
  const roleScore = roleTerms.size ? roleOverlap / roleTerms.size : 0;
  const skillScore = skillTerms.size ? skillOverlap / skillTerms.size : 0;
  return Math.round(100 * (roleTerms.size && skillTerms.size ? roleScore * 0.65 + skillScore * 0.35 : roleScore || skillScore));
};
const validDraftId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const contactWindow = (details: Record<string, unknown>, now = new Date()) => {
  if (details.showRecruiterContact !== true) return null;
  const start = typeof details.contactStart === "string" ? details.contactStart : "09:00";
  const end = typeof details.contactEnd === "string" ? details.contactEnd : "18:00";
  const timeZone = typeof details.timeZone === "string" ? details.timeZone : "Asia/Kolkata";
  const parseTime = (value: string) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const startMinute = parseTime(start);
  const endMinute = parseTime(end);
  if (startMinute === null || endMinute === null || startMinute === endMinute) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    const second = Number(parts.find((part) => part.type === "second")?.value);
    const currentSecond = hour * 3600 + minute * 60 + second;
    const startSecond = startMinute * 60;
    const endSecond = endMinute * 60;
    const visible = startMinute < endMinute
      ? currentSecond >= startSecond && currentSecond < endSecond
      : currentSecond >= startSecond || currentSecond < endSecond;
    if (!visible) return null;
    const remainingSeconds = startMinute < endMinute
      ? endSecond - currentSecond
      : (currentSecond >= startSecond ? 86_400 - currentSecond + endSecond : endSecond - currentSecond);
    return { remainingMilliseconds: remainingSeconds * 1000 - now.getMilliseconds() };
  } catch {
    return null;
  }
};
const publicJobDetails = (details: Record<string, unknown>) => {
  const {
    notifyByEmail: _notifyByEmail,
    showRecruiterContact: _showRecruiterContact,
    contactStart: _contactStart,
    contactEnd: _contactEnd,
    timeZone: _timeZone,
    ...publicDetails
  } = details;
  return publicDetails;
};

router.get("/jobs/drafts/current", requireAuth, requireVerifiedRecruiter, async (req, res, next) => {
  try {
    const [draft] = await db.select().from(jobPostingDrafts)
      .where(eq(jobPostingDrafts.recruiterId, req.authUser!.id))
      .orderBy(desc(jobPostingDrafts.updatedAt)).limit(1);
    res.json({ draft: draft || null });
  } catch (error) { next(error); }
});

router.post("/jobs/drafts", requireAuth, requireVerifiedRecruiter, async (req, res, next) => {
  try {
    const details = normalizeDetails(req.body?.details);
    const currentStep = Number(req.body?.currentStep);
    if (!details || !Number.isInteger(currentStep) || currentStep < 1 || currentStep > 5) {
      res.status(400).json({ error: "A valid job draft and step are required" }); return;
    }
    const [company] = await db.select({ id: companies.id }).from(companies)
      .where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
    if (!company) { res.status(409).json({ error: "Create a company profile before saving a job draft" }); return; }
    const [draft] = await db.insert(jobPostingDrafts).values({
      recruiterId: req.authUser!.id,
      companyId: company.id,
      currentStep,
      details,
    }).returning();
    res.status(201).json({ draft });
  } catch (error) { next(error); }
});

router.put("/jobs/drafts/:id", requireAuth, requireVerifiedRecruiter, async (req, res, next) => {
  try {
    if (!validDraftId(req.params.id)) { res.status(400).json({ error: "Invalid job draft ID" }); return; }
    const details = normalizeDetails(req.body?.details);
    const currentStep = Number(req.body?.currentStep);
    if (!details || !Number.isInteger(currentStep) || currentStep < 1 || currentStep > 5) {
      res.status(400).json({ error: "A valid job draft and step are required" }); return;
    }
    const [draft] = await db.update(jobPostingDrafts).set({
      currentStep,
      details,
      updatedAt: new Date(),
    }).where(and(
      eq(jobPostingDrafts.id, req.params.id),
      eq(jobPostingDrafts.recruiterId, req.authUser!.id),
    )).returning();
    if (!draft) { res.status(404).json({ error: "Job draft not found" }); return; }
    res.json({ draft });
  } catch (error) { next(error); }
});

router.delete("/jobs/drafts/:id", requireAuth, requireVerifiedRecruiter, async (req, res, next) => {
  try {
    if (!validDraftId(req.params.id)) { res.status(400).json({ error: "Invalid job draft ID" }); return; }
    const [draft] = await db.delete(jobPostingDrafts).where(and(
      eq(jobPostingDrafts.id, req.params.id),
      eq(jobPostingDrafts.recruiterId, req.authUser!.id),
    )).returning({ id: jobPostingDrafts.id });
    if (!draft) { res.status(404).json({ error: "Job draft not found" }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/jobs", async (_req, res, next) => {
  try {
    const rows = await db.select({
      ...jobProjection,
      recruiterName: sql<string>`coalesce(${companies.recruiterContactName}, ${users.name})`,
      recruiterEmail: sql<string | null>`coalesce(${companies.contactEmail}, ${users.email})`,
      recruiterPhone: sql<string | null>`coalesce(${companies.phone}, ${users.phoneNumber})`,
    }).from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .innerJoin(users, eq(companies.recruiterId, users.id))
      .where(eq(jobs.status, "active"))
      .orderBy(desc(jobs.postedAt));
    const now = new Date();
    res.json({ jobs: rows.map((job) => {
      const window = contactWindow(job.details, now);
      return {
        ...job,
        details: publicJobDetails(job.details),
        recruiterContact: window
          ? { name: job.recruiterName, email: job.recruiterEmail, phone: job.recruiterPhone }
          : null,
        recruiterContactExpiresAt: window
          ? new Date(now.getTime() + window.remainingMilliseconds).toISOString()
          : null,
        recruiterName: undefined,
        recruiterEmail: undefined,
        recruiterPhone: undefined,
      };
    }) });
  } catch (error) { next(error); }
});

router.get("/jobs/:id/candidates", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "recruiter") { res.status(403).json({ error: "Recruiter access required" }); return; }
    const [record] = await db.select({
      job: jobs,
      recruiterId: companies.recruiterId,
      verificationStatus: companies.verificationStatus,
    }).from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, String(req.params.id)))
      .limit(1);
    if (!record || record.recruiterId !== req.authUser!.id) { res.status(404).json({ error: "Job not found" }); return; }
    if (record.verificationStatus !== "verified") { res.status(403).json({ error: "Company verification is required before searching candidate profiles" }); return; }

    const appliedRows = await db.select({ seekerId: applications.seekerId })
      .from(applications).where(eq(applications.jobId, record.job.id));
    const appliedCandidateIds = new Set(appliedRows.map((application) => application.seekerId));
    const candidateRows = await db.select({
      id: users.id,
      name: users.name,
      city: users.city,
      profile: users.profileData,
    }).from(users)
      .where(eq(users.role, "job_seeker"))
      .limit(500);
    const candidates = candidateRows.flatMap((candidate) => {
      const profile = candidate.profile;
      if (!profile || profile.contactVisibility !== "recruiters" || appliedCandidateIds.has(candidate.id)) return [];
      const matchScore = candidateMatchScore(record.job, profile);
      if (matchScore === 0) return [];
      return [{
        id: candidate.id,
        name: candidate.name,
        city: candidate.city,
        matchScore,
        profile: {
          gender: profile.gender,
          age: profile.age,
          englishLevel: profile.englishLevel,
          totalExperience: profile.totalExperience,
          headline: profile.headline || "",
          location: profile.location || profile.city || candidate.city || "",
          summary: profile.summary || "",
          strengths: profile.strengths || [],
          careerProfile: profile.careerProfile || {},
          experiences: profile.experiences || [],
          educations: profile.educations || [],
        },
      }];
    }).sort((left, right) => right.matchScore - left.matchScore);
    res.json({
      job: {
        id: record.job.id,
        title: record.job.title,
        category: record.job.category,
        location: record.job.location,
        employmentType: record.job.employmentType,
        workMode: record.job.workMode,
        experience: record.job.experience,
        salaryMin: record.job.salaryMin,
        salaryMax: record.job.salaryMax,
        skills: record.job.skills,
        details: record.job.details,
      },
      candidates,
    });
  } catch (error) { next(error); }
});

router.post("/jobs/:id/feedback", requireAuth, requireVerifiedRecruiter, async (req, res, next) => {
  try {
    const feedback = typeof req.body?.feedback === "string" ? req.body.feedback.trim() : "";
    if (!feedback || feedback.length > 2000) {
      res.status(400).json({ error: "Feedback must be between 1 and 2000 characters" }); return;
    }
    const [job] = await db.select({
      id: jobs.id,
      recruiterId: companies.recruiterId,
    }).from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, String(req.params.id)))
      .limit(1);
    if (!job || job.recruiterId !== req.authUser!.id) {
      res.status(404).json({ error: "Job not found" }); return;
    }
    const [saved] = await db.insert(jobPostingFeedback).values({
      jobId: job.id,
      recruiterId: job.recruiterId,
      feedback,
    }).onConflictDoNothing({ target: jobPostingFeedback.jobId }).returning();
    if (saved) {
      res.status(201).json({ feedback: saved });
      return;
    }
    const [existing] = await db.select().from(jobPostingFeedback)
      .where(eq(jobPostingFeedback.jobId, job.id)).limit(1);
    if (!existing) { res.status(409).json({ error: "Feedback could not be saved; please try again" }); return; }
    res.json({ feedback: existing });
  } catch (error) { next(error); }
});

router.get("/admin/job-feedback", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "admin") { res.status(403).json({ error: "Administrator access required" }); return; }
    const records = await db.select({
      id: jobPostingFeedback.id,
      jobId: jobs.id,
      jobTitle: jobs.title,
      companyName: companies.name,
      recruiterName: users.name,
      recruiterEmail: users.email,
      feedback: jobPostingFeedback.feedback,
      createdAt: jobPostingFeedback.createdAt,
    }).from(jobPostingFeedback)
      .innerJoin(jobs, eq(jobPostingFeedback.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .innerJoin(users, eq(jobPostingFeedback.recruiterId, users.id))
      .orderBy(desc(jobPostingFeedback.createdAt));
    res.json({ feedback: records });
  } catch (error) { next(error); }
});

router.post("/jobs/:id/view", async (req, res, next) => {
  try {
    const [job] = await db.update(jobs)
      .set({ views: sql`${jobs.views} + 1` })
      .where(and(eq(jobs.id, String(req.params.id)), eq(jobs.status, "active")))
      .returning({ views: jobs.views });
    if (!job) { res.status(404).json({ error: "Active job not found" }); return; }
    res.json(job);
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
    const details = normalizeDetails(req.body?.details);
    const salaryMin = Number(req.body?.salaryMin);
    const salaryMax = Number(req.body?.salaryMax);
    const draftId = req.body?.draftId;
    if (req.body?.details !== undefined && !details) {
      res.status(400).json({ error: "Job details are invalid or too large" }); return;
    }
    if (req.body?.draftId !== undefined && !validDraftId(draftId)) {
      res.status(400).json({ error: "Invalid job draft ID" }); return;
    }
    if (Number.isFinite(salaryMin) && Number.isFinite(salaryMax) && salaryMin > salaryMax) {
      res.status(400).json({ error: "Minimum salary cannot exceed maximum salary" }); return;
    }
    const created = await db.transaction(async (transaction) => {
      if (draftId) {
        const [ownedDraft] = await transaction.select({ id: jobPostingDrafts.id }).from(jobPostingDrafts)
          .where(and(
            eq(jobPostingDrafts.id, draftId),
            eq(jobPostingDrafts.recruiterId, req.authUser!.id),
            eq(jobPostingDrafts.companyId, company.id),
          )).limit(1);
        if (!ownedDraft) return null;
      }
      const [job] = await transaction.insert(jobs).values({
        companyId: company.id,
        title,
        category: String(req.body?.category || "Other").trim().slice(0, 80),
        location,
        description,
        workMode: String(req.body?.mode || "On-site").slice(0, 30),
        employmentType: String(req.body?.type || "Full-time").slice(0, 40),
        experience: String(req.body?.experience || "Not specified").slice(0, 80),
        skills: normalizeSkills(req.body?.skills),
        salaryMin: Number.isSafeInteger(salaryMin) && salaryMin >= 0 ? salaryMin : null,
        salaryMax: Number.isSafeInteger(salaryMax) && salaryMax >= 0 ? salaryMax : null,
        details: details || {},
        status: "pending",
      }).returning();
      if (draftId) {
        await transaction.delete(jobPostingDrafts).where(and(
          eq(jobPostingDrafts.id, draftId),
          eq(jobPostingDrafts.recruiterId, req.authUser!.id),
        ));
      }
      return job;
    });
    if (!created) { res.status(404).json({ error: "Job draft not found" }); return; }
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
    const requestedStatus = req.body?.status;
    if (requestedStatus !== undefined && !["draft", "pending", "active", "paused", "closed"].includes(requestedStatus)) {
      res.status(400).json({ error: "Invalid job status" }); return;
    }
    if (requestedStatus && requestedStatus !== record.job.status
      && !canTransitionJob(record.job.status, requestedStatus, req.authUser!.role)) {
      const error = requestedStatus === "active" && req.authUser!.role !== "admin"
        ? "Only an administrator can approve and activate jobs"
        : "This job status transition is not allowed";
      res.status(403).json({ error });
      return;
    }
    if (req.body?.placement !== undefined && req.body.placement !== "featured" && req.body.placement !== "normal") {
      res.status(400).json({ error: "Invalid job placement" }); return;
    }
    if (req.body?.placement === "featured") {
      const entitlements = await getAccountEntitlements(record.recruiterId, "recruiter");
      if (!entitlements.canFeatureJobs) {
        res.status(403).json({ error: "Featured placement requires an eligible, payment-verified recruiter plan" }); return;
      }
    }
    const changes = {
      ...(requestedStatus ? { status: requestedStatus as typeof record.job.status } : {}),
      ...(req.body?.placement ? { placement: req.body.placement as "featured" | "normal" } : {}),
      ...(typeof req.body?.title === "string" ? { title: req.body.title.trim().slice(0, 180) } : {}),
      ...(typeof req.body?.category === "string" ? { category: req.body.category.trim().slice(0, 80) || "Other" } : {}),
      ...(Array.isArray(req.body?.skills) ? { skills: normalizeSkills(req.body.skills) } : {}),
      ...(typeof req.body?.details === "object" && req.body.details && !Array.isArray(req.body.details) ? { details: normalizeDetails(req.body.details) || {} } : {}),
      ...(typeof req.body?.location === "string" ? { location: req.body.location.trim().slice(0, 140) } : {}),
      ...(typeof req.body?.mode === "string" ? { workMode: req.body.mode.slice(0, 30) } : {}),
      ...(typeof req.body?.type === "string" ? { employmentType: req.body.type.slice(0, 40) } : {}),
      ...(typeof req.body?.experience === "string" ? { experience: req.body.experience.slice(0, 80) } : {}),
      ...(typeof req.body?.description === "string" ? { description: req.body.description.trim().slice(0, 20_000) } : {}),
      ...(req.body?.salaryMin !== undefined ? { salaryMin: Number.isSafeInteger(Number(req.body.salaryMin)) && Number(req.body.salaryMin) >= 0 ? Number(req.body.salaryMin) : null } : {}),
      ...(req.body?.salaryMax !== undefined ? { salaryMax: Number.isSafeInteger(Number(req.body.salaryMax)) && Number(req.body.salaryMax) >= 0 ? Number(req.body.salaryMax) : null } : {}),
    };
    const activating = requestedStatus === "active" && record.job.status !== "active";
    if (!activating) {
      const [updated] = await db.update(jobs).set(changes).where(eq(jobs.id, record.job.id)).returning();
      res.json({ job: updated });
      return;
    }

    const entitlements = await getAccountEntitlements(record.recruiterId, "recruiter");
    const updated = await db.transaction(async (transaction) => {
      await transaction.select({ id: companies.id }).from(companies)
        .where(eq(companies.id, record.job.companyId)).for("update");
      const [usage] = await transaction.select({ activeJobs: count() }).from(jobs)
        .where(and(eq(jobs.companyId, record.job.companyId), eq(jobs.status, "active")));
      if (entitlements.maxActiveJobs !== null && usage.activeJobs >= entitlements.maxActiveJobs) return null;
      const [job] = await transaction.update(jobs).set(changes)
        .where(eq(jobs.id, record.job.id)).returning();
      return job;
    });
    if (!updated) {
      res.status(409).json({
        error: `This account's ${entitlements.plan} plan allows ${entitlements.maxActiveJobs} active job${entitlements.maxActiveJobs === 1 ? "" : "s"}`,
      });
      return;
    }
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
