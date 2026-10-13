import { Router, type IRouter } from "express";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { applicationStatusHistory, applications, companies, db, jobs, users, type ApplicationResumeSnapshot } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccountEntitlements } from "../lib/entitlements";
import { canTransitionApplication } from "../lib/business-rules";
import { getSender, sendEmail } from "../lib/mailer";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const escapeEmailHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] || character);

router.get("/applications", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === "recruiter") {
      const [company] = await db.select({ verificationStatus: companies.verificationStatus }).from(companies)
        .where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
      if (company?.verificationStatus !== "verified") {
        res.status(403).json({ error: "Company verification is required before reviewing applications" }); return;
      }
    }
    const base = db.select({ id: applications.id, jobId: jobs.id, jobTitle: jobs.title, company: companies.name, seekerId: users.id, applicantName: users.name, applicantEmail: users.email, applicantPhone: users.phoneNumber, applicantProfile: users.profileData, resumeSnapshot: applications.resumeSnapshot, status: applications.status, coverNote: applications.coverNote, appliedAt: applications.appliedAt, recruiterId: companies.recruiterId })
      .from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).innerJoin(companies, eq(jobs.companyId, companies.id)).innerJoin(users, eq(applications.seekerId, users.id));
    const rows = req.authUser!.role === "job_seeker"
      ? await base.where(eq(applications.seekerId, req.authUser!.id)).orderBy(desc(applications.appliedAt))
      : req.authUser!.role === "recruiter"
        ? await base.where(eq(companies.recruiterId, req.authUser!.id)).orderBy(desc(applications.appliedAt))
        : await base.orderBy(desc(applications.appliedAt));
    const historyRows = rows.length
      ? await db.select({
        applicationId: applicationStatusHistory.applicationId,
        fromStatus: applicationStatusHistory.fromStatus,
        toStatus: applicationStatusHistory.toStatus,
        changedById: applicationStatusHistory.changedById,
        actorRole: applicationStatusHistory.actorRole,
        note: applicationStatusHistory.note,
        changedAt: applicationStatusHistory.changedAt,
        actorName: users.name,
      }).from(applicationStatusHistory)
        .innerJoin(users, eq(applicationStatusHistory.changedById, users.id))
        .where(inArray(applicationStatusHistory.applicationId, rows.map((application) => application.id)))
        .orderBy(desc(applicationStatusHistory.changedAt))
      : [];
    const histories = new Map<string, typeof historyRows>();
    for (const item of historyRows) {
      histories.set(item.applicationId, [...(histories.get(item.applicationId) || []), item]);
    }
    res.json({ applications: rows.map(({ recruiterId: _recruiterId, applicantProfile, applicantPhone, resumeSnapshot, ...application }) => {
      const canReviewProfile = (req.authUser!.role === "job_seeker" && application.seekerId === req.authUser!.id)
        || (req.authUser!.role === "recruiter" && _recruiterId === req.authUser!.id);
      const canViewContactDetails = canReviewProfile
        && (req.authUser!.role === "job_seeker" || applicantProfile?.contactVisibility === "recruiters");
      const canViewResume = (req.authUser!.role === "job_seeker" && application.seekerId === req.authUser!.id)
        || (req.authUser!.role === "recruiter" && _recruiterId === req.authUser!.id);
      const history = histories.get(application.id) || [];
      const visibleProfile = canReviewProfile && applicantProfile ? { ...applicantProfile } : null;
      if (visibleProfile) {
        const resumeDocument = applicantProfile?.resumeDocument;
        delete visibleProfile.resumeDocument;
        if (resumeDocument && typeof resumeDocument === "object") {
          visibleProfile.resumeDocument = {
            name: resumeDocument.name,
            mimeType: resumeDocument.mimeType,
            dataUrl: "",
          };
        }
        if (!canViewContactDetails) {
          delete visibleProfile.phone;
          delete (visibleProfile as Record<string, unknown>).email;
          delete visibleProfile.addressLine;
          delete visibleProfile.pincode;
        }
      }
      const visibleResume = canViewResume && resumeSnapshot ? {
        ...resumeSnapshot,
        profile: {
          ...resumeSnapshot.profile,
          resumeDocument: resumeSnapshot.profile.resumeDocument
            ? { name: resumeSnapshot.profile.resumeDocument.name, mimeType: resumeSnapshot.profile.resumeDocument.mimeType }
            : undefined,
        },
      } : null;
      return {
        ...application,
        resumeSnapshot: visibleResume,
        history: history.length ? history : [{
          fromStatus: null,
          toStatus: "applied",
          changedById: application.seekerId,
          actorRole: "job_seeker",
          actorName: application.applicantName,
          note: null,
          changedAt: application.appliedAt,
        }],
        applicantEmail: canViewContactDetails ? application.applicantEmail : null,
        applicantPhone: canViewContactDetails ? applicantPhone : null,
        applicantProfile: visibleProfile,
      };
    }) });
  } catch (error) { next(error); }
});

router.get("/applications/:id/resume", requireAuth, async (req, res, next) => {
  try {
    const [record] = await db.select({
      seekerId: applications.seekerId,
      recruiterId: companies.recruiterId,
      verificationStatus: companies.verificationStatus,
      resumeSnapshot: applications.resumeSnapshot,
      applicantProfile: users.profileData,
    }).from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .innerJoin(users, eq(applications.seekerId, users.id))
      .where(eq(applications.id, String(req.params.id))).limit(1);
    const isSeeker = req.authUser!.role === "job_seeker" && record?.seekerId === req.authUser!.id;
    const isRecruiter = req.authUser!.role === "recruiter"
      && record?.recruiterId === req.authUser!.id
      && record.verificationStatus === "verified";
    const profileResume = req.query.source === "profile";
    const resumeDocument = profileResume
      ? record?.applicantProfile?.resumeDocument
      : record?.resumeSnapshot?.profile.resumeDocument;
    const selectedResumeIsUploaded = profileResume || record?.resumeSnapshot?.selectedResumeId === "uploaded";
    if ((!isSeeker && !isRecruiter) || !selectedResumeIsUploaded || !resumeDocument?.dataUrl) {
      res.status(404).json({ error: "Uploaded application resume not found" }); return;
    }
    res.json({ resumeDocument });
  } catch (error) { next(error); }
});

router.post("/applications", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "job_seeker") { res.status(403).json({ error: "Job-seeker access required" }); return; }
    const jobId = String(req.body?.jobId || "");
    const resumeSnapshot = req.body?.resumeSnapshot;
    const validResumeIds = ["template-modern", "template-classic", "template-minimal", "uploaded"];
    if (resumeSnapshot !== undefined && (!resumeSnapshot || typeof resumeSnapshot !== "object" || Array.isArray(resumeSnapshot)
      || !validResumeIds.includes(resumeSnapshot.selectedResumeId)
      || typeof resumeSnapshot.selectedResumeName !== "string" || resumeSnapshot.selectedResumeName.length > 255
      || !resumeSnapshot.profile || typeof resumeSnapshot.profile !== "object" || Array.isArray(resumeSnapshot.profile)
      || JSON.stringify(resumeSnapshot).length > 1_800_000)) {
      res.status(400).json({ error: "Choose a valid resume before applying" }); return;
    }
    if (resumeSnapshot && resumeSnapshot.selectedResumeId !== "uploaded") {
      const template = resumeSnapshot.templateContent;
      const stringFields = ["name", "email", "phone", "headline", "location"] as const;
      const arraysValid = (field: "strengths" | "experiences" | "educations" | "certificates") => {
        const value = template?.[field];
        if (!Array.isArray(value) || value.length > 20) return false;
        if (field === "strengths") return value.every((item) => typeof item === "string" && item.length <= 80);
        const rowKeys = field === "experiences" ? ["role", "company", "period"]
          : field === "educations" ? ["degree", "school", "period"]
            : ["name", "issuer", "year"];
        return value.every((row) => row && typeof row === "object" && rowKeys.every((key) => typeof row[key] === "string" && row[key].length <= 255));
      };
      if (!template || typeof template !== "object" || stringFields.some((field) => typeof template[field] !== "string" || template[field].length > 255)
        || !arraysValid("strengths") || !arraysValid("experiences") || !arraysValid("educations") || !arraysValid("certificates")) {
        res.status(400).json({ error: "Save a valid version of the selected resume template before applying" }); return;
      }
    }
    if (resumeSnapshot?.selectedResumeId === "uploaded") {
      const document = resumeSnapshot.profile.resumeDocument;
      if (!document || typeof document.name !== "string" || document.name.length > 255
        || !["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"].includes(document.mimeType)
        || typeof document.dataUrl !== "string"
        || !/^data:(?:application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain|text\/markdown);base64,[A-Za-z0-9+/]+={0,2}$/.test(document.dataUrl)
        || document.dataUrl.length > 1_400_000) {
        res.status(400).json({ error: "The uploaded resume is invalid or too large" }); return;
      }
    }
    const entitlements = await getAccountEntitlements(req.authUser!.id, "job_seeker");
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const created = await db.transaction(async (transaction) => {
      await transaction.select({ id: users.id }).from(users)
        .where(eq(users.id, req.authUser!.id)).for("update");
      const [usage] = await transaction.select({ monthlyApplications: count() }).from(applications)
        .where(and(eq(applications.seekerId, req.authUser!.id), gte(applications.appliedAt, monthStart)));
      if (entitlements.monthlyApplications !== null && usage.monthlyApplications >= entitlements.monthlyApplications) {
        return { quotaReached: true as const };
      }
      const [job] = await transaction.select({
        id: jobs.id,
        title: jobs.title,
        details: jobs.details,
        recruiterName: users.name,
        recruiterEmail: users.email,
        recruiterId: users.id,
      }).from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .innerJoin(users, eq(companies.recruiterId, users.id))
        .where(and(eq(jobs.id, jobId), eq(jobs.status, "active"))).limit(1);
      if (!job) return { jobNotFound: true as const };
      const [application] = await transaction.insert(applications).values({
        jobId,
        seekerId: req.authUser!.id,
        ...(resumeSnapshot ? { resumeSnapshot } : {}),
        coverNote: String(req.body?.coverNote || "").trim().slice(0, 5_000) || null,
      }).returning();
      await transaction.insert(applicationStatusHistory).values({
        applicationId: application.id,
        fromStatus: null,
        toStatus: "applied",
        changedById: req.authUser!.id,
        actorRole: "job_seeker",
      });
      return { application, job };
    });
    if ("quotaReached" in created) {
      res.status(403).json({ error: `The Free plan allows ${entitlements.monthlyApplications} applications per month` });
      return;
    }
    if ("jobNotFound" in created) {
      res.status(404).json({ error: "Active job not found" });
      return;
    }
    let notificationSent = false;
    if (created.job.details.notifyByEmail === true) {
      try {
        const safeJobTitle = escapeEmailHtml(created.job.title);
        const safeRecruiterName = escapeEmailHtml(created.job.recruiterName);
        await sendEmail({
          to: { name: created.job.recruiterName, address: created.job.recruiterEmail },
          replyTo: getSender(),
          subject: `New application for ${created.job.title}`,
          text: `${created.job.recruiterName},\n\nA candidate has applied for ${created.job.title}. Open your recruiter workspace to review the application.`,
          html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172554"><p>Hi ${safeRecruiterName},</p><p>A candidate has applied for <strong>${safeJobTitle}</strong>.</p><p>Open your recruiter workspace to review the application.</p></body></html>`,
          idempotencyKey: `application-${created.application.id}-recruiter-notification`,
        });
        notificationSent = true;
      } catch (error) {
        logger.error({ error, applicationId: created.application.id, recruiterId: created.job.recruiterId }, "Application saved but recruiter email notification failed");
      }
    }
    res.status(201).json({ application: created.application, notificationSent });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") { res.status(409).json({ error: "You already applied for this job" }); return; }
    next(error);
  }
});

router.patch("/applications/:id", requireAuth, async (req, res, next) => {
  try {
    const nextStatus = req.body?.status;
    const allowed = ["applied", "viewed", "shortlisted", "interview", "selected", "rejected", "withdrawn"];
    if (!allowed.includes(nextStatus)) { res.status(400).json({ error: "Invalid application status" }); return; }
    const [record] = await db.select({
      application: applications,
      recruiterId: companies.recruiterId,
      verificationStatus: companies.verificationStatus,
      jobTitle: jobs.title,
      companyName: companies.name,
      candidateName: users.name,
      candidateEmail: users.email,
    }).from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .innerJoin(users, eq(applications.seekerId, users.id))
      .where(eq(applications.id, String(req.params.id))).limit(1);
    if (!record) { res.status(404).json({ error: "Application not found" }); return; }
    const canUpdate = (req.authUser!.role === "admin")
      || (req.authUser!.role === "recruiter" && record.recruiterId === req.authUser!.id)
      || (req.authUser!.role === "job_seeker" && record.application.seekerId === req.authUser!.id
        && nextStatus === "withdrawn");
    if (!canUpdate) { res.status(403).json({ error: "You cannot update this application" }); return; }
    if (req.authUser!.role === "recruiter" && record.verificationStatus !== "verified") { res.status(403).json({ error: "Company verification is required before managing applications" }); return; }
    if (nextStatus === record.application.status) {
      res.json({ application: record.application });
      return;
    }
    if (!canTransitionApplication(record.application.status, nextStatus, req.authUser!.role)) {
      res.status(409).json({ error: `Application cannot move from ${record.application.status} to ${nextStatus}` });
      return;
    }
    const note = req.authUser!.role === "recruiter" && nextStatus === "rejected"
      ? `Thank you for your interest in ${record.jobTitle} at ${record.companyName}. After careful review, we have decided to move forward with candidates whose experience more closely matches this role. We appreciate the time you invested and wish you the very best in your job search.`
      : typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 1000) || null : null;
    const updated = await db.transaction(async (transaction) => {
      const [locked] = await transaction.select({ status: applications.status }).from(applications)
        .where(eq(applications.id, record.application.id)).for("update");
      if (!locked || locked.status !== record.application.status) return null;
      const [application] = await transaction.update(applications)
        .set({ status: nextStatus })
        .where(eq(applications.id, record.application.id)).returning();
      await transaction.insert(applicationStatusHistory).values({
        applicationId: record.application.id,
        fromStatus: record.application.status,
        toStatus: nextStatus,
        changedById: req.authUser!.id,
        actorRole: req.authUser!.role,
        note,
      });
      return application;
    });
    if (!updated) {
      res.status(409).json({ error: "Application changed before this update; refresh and try again" });
      return;
    }
    if (req.authUser!.role === "recruiter" && nextStatus === "rejected") {
      try {
        const safeCandidateName = escapeEmailHtml(record.candidateName);
        const safeJobTitle = escapeEmailHtml(record.jobTitle);
        const safeCompanyName = escapeEmailHtml(record.companyName);
        await sendEmail({
          to: { name: record.candidateName, address: record.candidateEmail },
          replyTo: getSender(),
          subject: `An update on your ${record.jobTitle} application`,
          text: `Hi ${record.candidateName},\n\n${note}\n\nRegards,\n${record.companyName}`,
          html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172554"><p>Hi ${safeCandidateName},</p><p>${escapeEmailHtml(note || "")}</p><p>Regards,<br>${safeCompanyName}</p></body></html>`,
          idempotencyKey: `application-${record.application.id}-rejection-notice`,
        });
      } catch (error) {
        logger.error({ error, applicationId: record.application.id, recruiterId: record.recruiterId }, "Application rejected but candidate email notification failed");
      }
    }
    res.json({ application: updated });
  } catch (error) { next(error); }
});

export default router;
