import express, { Router, type IRouter, type Response } from "express";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { companies, companyVerificationDocuments, db, passwordResetOtps, phoneOtpChallenges, users, type ResumeTemplateContent, type SeekerProfileData } from "@workspace/db";
import { createSession, destroySession, hashPassword, publicUser, requireAuth, verifyPassword } from "../lib/auth";
import { sendPhoneOtp, SmsProviderError } from "../lib/fast2sms";
import { getSender, sendEmail } from "../lib/mailer";

const router: IRouter = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const verificationDocumentTypes = ["gst", "pan", "msme", "offer_letter", "other"] as const;
const verificationMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const requireAdmin = (req: import("express").Request, res: Response) => {
  if (req.authUser?.role === "admin") return true;
  res.status(403).json({ error: "Administrator access required" });
  return false;
};
const otpHash = (email: string, code: string) => createHash("sha256").update(`${email}\n${code}\n${process.env.SESSION_SECRET || ""}`).digest("hex");
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
const normalizeMobile = (input: unknown) => {
  const value = String(input || "").trim();
  const digits = value.replace(/\D/g, "");
  const mobile = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(mobile) ? mobile : null;
};
const maskMobile = (mobile: string) => `+91 ${mobile.slice(0, 5).replace(/\d/g, "X")} ${mobile.slice(5).replace(/\d/g, "X")}`;
type PhoneOtpPurpose = "login" | "register";
class PhoneOtpFlowError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PhoneOtpFlowError";
  }
}
const phoneOtpHash = (mobile: string, purpose: PhoneOtpPurpose, code: string) =>
  createHash("sha256").update(`${mobile}\n${purpose}\n${code}\n${process.env.SESSION_SECRET || ""}`).digest("hex");
const issuePhoneOtp = async (mobile: string, purpose: PhoneOtpPurpose, resend = false) => {
  const [previous] = await db.select().from(phoneOtpChallenges).where(eq(phoneOtpChallenges.phoneNumber, mobile)).limit(1);
  const now = new Date();
  if (resend && (!previous || previous.purpose !== purpose)) {
    throw new PhoneOtpFlowError("Request a verification code before resending it.", 400);
  }
  if (previous && now.getTime() - previous.createdAt.getTime() < 30_000) {
    throw new PhoneOtpFlowError("Please wait before requesting another verification code.", 429);
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sendPhoneOtp(mobile, code);
  await db.insert(phoneOtpChallenges).values({
    phoneNumber: mobile,
    purpose,
    codeHash: phoneOtpHash(mobile, purpose, code),
    expiresAt: new Date(now.getTime() + 10 * 60_000),
    attempts: 0,
    createdAt: now,
  }).onConflictDoUpdate({
    target: phoneOtpChallenges.phoneNumber,
    set: {
      purpose,
      codeHash: phoneOtpHash(mobile, purpose, code),
      expiresAt: new Date(now.getTime() + 10 * 60_000),
      attempts: 0,
      createdAt: now,
    },
  });
};
const verifyPhoneChallenge = async (mobile: string, purpose: PhoneOtpPurpose, code: string) =>
  db.transaction(async (transaction) => {
    const [challenge] = await transaction.select().from(phoneOtpChallenges)
      .where(and(
        eq(phoneOtpChallenges.phoneNumber, mobile),
        eq(phoneOtpChallenges.purpose, purpose),
        gt(phoneOtpChallenges.expiresAt, new Date()),
      ))
      .for("update")
      .limit(1);
    if (!challenge || challenge.attempts >= 5) return false;

    const expected = Buffer.from(challenge.codeHash, "hex");
    const actual = Buffer.from(phoneOtpHash(mobile, purpose, code), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await transaction.update(phoneOtpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(phoneOtpChallenges.phoneNumber, mobile));
      return false;
    }

    await transaction.delete(phoneOtpChallenges)
      .where(eq(phoneOtpChallenges.phoneNumber, mobile));
    return true;
  });
const sendProviderError = (error: unknown, res: Response) => {
  if (error instanceof SmsProviderError) {
    res.status(error.status).json({ error: error.message });
    return true;
  }
  if (error instanceof PhoneOtpFlowError) {
    res.status(error.status).json({ error: error.message });
    return true;
  }
  return false;
};

router.post("/auth/register", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 255);
    const password = String(req.body?.password || "");
    const role = req.body?.role === "recruiter" ? "recruiter" : "job_seeker";
    const companyName = String(req.body?.company || "").trim().slice(0, 160);
    const mobile = normalizeMobile(req.body?.phoneNumber);
    const otp = String(req.body?.otp || "").trim();
    if (name.length < 2 || !emailPattern.test(email) || password.length < 8 || !mobile || !/^\d{6}$/.test(otp) || (role === "recruiter" && companyName.length < 2)) {
      res.status(400).json({ error: "Enter valid account details, a 10-digit mobile number, and its 6-digit verification code." }); return;
    }
    if (!(await verifyPhoneChallenge(mobile, "register", otp))) { res.status(400).json({ error: "The phone verification code is invalid or expired." }); return; }
    const passwordHash = await hashPassword(password);
    const user = await db.transaction(async (transaction) => {
      const [created] = await transaction.insert(users).values({ name, email, passwordHash, role, phoneNumber: mobile }).returning();
      if (!created) throw new Error("User creation failed");
      if (role === "recruiter") await transaction.insert(companies).values({ name: companyName, recruiterContactName: name, industry: "Not specified", city: "Not specified", recruiterId: created.id });
      return created;
    });
    await createSession(user.id, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (sendProviderError(error, res)) return;
    if ((error as { code?: string }).code === "23505") { res.status(409).json({ error: "An account already uses that email address" }); return; }
    next(error);
  }
});

router.post("/auth/register/otp/send", async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body?.phoneNumber);
    if (!mobile) { res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." }); return; }
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phoneNumber, mobile)).limit(1);
    if (existing) { res.status(409).json({ error: "An account already uses that mobile number. Sign in instead." }); return; }
    await issuePhoneOtp(mobile, "register");
    res.json({ phoneNumber: maskMobile(mobile) });
  } catch (error) {
    if (sendProviderError(error, res)) return;
    next(error);
  }
});

router.post("/auth/register/otp/resend", async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body?.phoneNumber);
    if (!mobile) { res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." }); return; }
    await issuePhoneOtp(mobile, "register", true);
    res.json({ phoneNumber: maskMobile(mobile) });
  } catch (error) {
    if (sendProviderError(error, res)) return;
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!emailPattern.test(email) || !password) {
      res.status(400).json({ error: "Enter a valid email address and password." });
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    await createSession(user.id, res);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login/otp/send", async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body?.phoneNumber);
    if (!mobile) { res.status(400).json({ error: "Enter a valid 10-digit mobile number." }); return; }
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.phoneNumber, mobile)).limit(1);
    if (user) await issuePhoneOtp(mobile, "login");
    res.json({ phoneNumber: maskMobile(mobile) });
  } catch (error) {
    if (sendProviderError(error, res)) return;
    next(error);
  }
});

router.post("/auth/login/otp/resend", async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body?.phoneNumber);
    if (!mobile) { res.status(400).json({ error: "Enter a valid 10-digit mobile number." }); return; }
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.phoneNumber, mobile)).limit(1);
    if (!user) {
      res.json({ phoneNumber: maskMobile(mobile) });
      return;
    }
    await issuePhoneOtp(mobile, "login", true);
    res.json({ phoneNumber: maskMobile(mobile) });
  } catch (error) {
    if (sendProviderError(error, res)) return;
    next(error);
  }
});

router.post("/auth/login/otp/verify", async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body?.phoneNumber);
    const otp = String(req.body?.otp || "").trim();
    if (!mobile || !/^\d{6}$/.test(otp)) { res.status(400).json({ error: "Enter a valid 10-digit mobile number and 6-digit verification code." }); return; }
    if (!(await verifyPhoneChallenge(mobile, "login", otp))) { res.status(400).json({ error: "The phone verification code is invalid or expired." }); return; }
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, mobile)).limit(1);
    if (!user) { res.status(400).json({ error: "The phone verification code is invalid or expired." }); return; }
    await createSession(user.id, res);
    res.json({ user: publicUser(user) });
  } catch (error) {
    if (sendProviderError(error, res)) return;
    next(error);
  }
});

router.post("/auth/logout", requireAuth, async (req, res, next) => {
  try { await destroySession(req, res); res.status(204).end(); } catch (error) { next(error); }
});

router.post("/auth/password-reset/request", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    // Always return this response so addresses cannot be enumerated.
    const accepted = { accepted: true, message: "If that email is registered, a verification code has been sent." };
    if (!emailPattern.test(email)) { res.json(accepted); return; }
    const [user] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
    if (!user) { res.json(accepted); return; }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await db.insert(passwordResetOtps).values({ userId: user.id, codeHash: otpHash(user.email, code), expiresAt }).onConflictDoUpdate({ target: passwordResetOtps.userId, set: { codeHash: otpHash(user.email, code), expiresAt, attempts: 0, createdAt: new Date() } });
    const safeName = escapeHtml(user.name);
    await sendEmail({
      to: { name: user.name, address: user.email }, replyTo: getSender(), subject: "Your Careerly password reset code",
      text: `Hi ${user.name},\n\nYour Careerly password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172554"><div style="max-width:560px;margin:32px auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #dbe4f2"><div style="padding:24px;background:#0b1f44;color:#fff"><strong style="font-size:20px">careerly</strong><p style="margin:10px 0 0;color:#bfdbfe">Password reset verification</p></div><div style="padding:28px"><p>Hi ${safeName},</p><p>Use this one-time code to reset your password:</p><p style="margin:24px 0;padding:16px;text-align:center;letter-spacing:8px;font-size:28px;font-weight:700;background:#eff6ff;border-radius:12px">${code}</p><p style="color:#64748b;font-size:13px">This code expires in 10 minutes. We will never ask you to share it.</p></div></div></body></html>`,
      idempotencyKey: `password-reset/${user.id}/${expiresAt.getTime()}`,
    });
    res.json(accepted);
  } catch (error) { next(error); }
});

router.post("/auth/password-reset/verify", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").replace(/\D/g, "");
    const password = String(req.body?.password || "");
    if (!emailPattern.test(email) || !/^\d{6}$/.test(code) || password.length < 8) { res.status(400).json({ error: "Enter a valid email, 6-digit code, and password of at least 8 characters." }); return; }
    const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
    if (!user) { res.status(400).json({ error: "The code is invalid or has expired." }); return; }
    const [otp] = await db.select().from(passwordResetOtps).where(and(eq(passwordResetOtps.userId, user.id), gt(passwordResetOtps.expiresAt, new Date()))).limit(1);
    if (!otp || otp.attempts >= 5 || otp.codeHash !== otpHash(user.email, code)) {
      if (otp) await db.update(passwordResetOtps).set({ attempts: otp.attempts + 1 }).where(eq(passwordResetOtps.id, otp.id));
      res.status(400).json({ error: "The code is invalid or has expired." }); return;
    }
    await db.transaction(async (transaction) => {
      await transaction.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
      await transaction.delete(passwordResetOtps).where(eq(passwordResetOtps.id, otp.id));
    });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/auth/me", requireAuth, (req, res) => res.json({ user: publicUser(req.authUser!) }));

router.get("/admin/users", requireAuth, async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
    res.json({ users: rows });
  } catch (error) { next(error); }
});

router.patch("/users/me", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body?.name || req.authUser!.name).trim().slice(0, 120);
    const email = String(req.body?.email || req.authUser!.email).trim().toLowerCase().slice(0, 255);
    if (name.length < 2 || !emailPattern.test(email)) { res.status(400).json({ error: "Enter a valid name and email" }); return; }
    const [updated] = await db.update(users).set({ name, email }).where(eq(users.id, req.authUser!.id)).returning();
    res.json({ user: publicUser(updated!) });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") { res.status(409).json({ error: "An account already uses that email address" }); return; }
    next(error);
  }
});

router.get("/users/me/profile", requireAuth, (req, res) => {
  if (req.authUser!.role !== "job_seeker") { res.status(403).json({ error: "Job-seeker access required" }); return; }
  res.json({ profile: { ...(req.authUser!.profileData || {}), phone: req.authUser!.phoneNumber || "" } });
});

router.patch("/users/me/profile", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "job_seeker") { res.status(403).json({ error: "Job-seeker access required" }); return; }
    const input = req.body?.profile;
    if (!input || typeof input !== "object" || Array.isArray(input)) { res.status(400).json({ error: "A valid profile is required" }); return; }
    const name = String(req.body?.name ?? req.authUser!.name).trim();
    const email = String(req.body?.email ?? req.authUser!.email).trim().toLowerCase();
    if (name.length < 2 || name.length > 120 || !emailPattern.test(email) || email.length > 255) {
      res.status(400).json({ error: "Enter a valid name and email address" }); return;
    }
    const textFields = ["headline", "location", "addressLine", "city", "state", "pincode", "resumeName", "summary"] as const;
    const maxLengths: Record<(typeof textFields)[number], number> = {
      headline: 160, location: 140, addressLine: 180, city: 100, state: 100, pincode: 6, resumeName: 255, summary: 2000,
    };
    const profile: SeekerProfileData = {};
    for (const field of textFields) {
      const value = input[field];
      if (value !== undefined && (typeof value !== "string" || value.trim().length > maxLengths[field])) {
        res.status(400).json({ error: `Profile field "${field}" is invalid` }); return;
      }
      if (typeof value === "string") profile[field] = value.trim();
    }
    if (input.gender !== undefined) {
      if (!["Female", "Male", "Non-binary", "Prefer not to say"].includes(input.gender)) {
        res.status(400).json({ error: "Choose a valid gender option" }); return;
      }
      profile.gender = input.gender;
    }
    if (input.age !== undefined) {
      if (!Number.isInteger(input.age) || input.age < 18 || input.age > 100) {
        res.status(400).json({ error: "Enter an age between 18 and 100" }); return;
      }
      profile.age = input.age;
    }
    if (input.englishLevel !== undefined) {
      if (!["Basic", "Conversational", "Intermediate", "Fluent", "Professional", "Native"].includes(input.englishLevel)) {
        res.status(400).json({ error: "Choose a valid English proficiency level" }); return;
      }
      profile.englishLevel = input.englishLevel;
    }
    if (input.totalExperience !== undefined) {
      if (typeof input.totalExperience !== "string" || input.totalExperience.trim().length > 80) {
        res.status(400).json({ error: "Enter a valid total experience range" }); return;
      }
      profile.totalExperience = input.totalExperience.trim();
    }
    if (profile.pincode && !/^[1-9]\d{5}$/.test(profile.pincode)) { res.status(400).json({ error: "Enter a valid 6-digit PIN code" }); return; }
    if (input.careerProfile !== undefined) {
      const source = input.careerProfile;
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        res.status(400).json({ error: 'Profile field "careerProfile" is invalid' }); return;
      }
      const careerProfile: NonNullable<SeekerProfileData["careerProfile"]> = {};
      const careerTextFields = [
        "industry", "department", "roleCategory", "jobRole", "jobType",
        "employmentType", "expectedSalary", "shift", "noticePeriod",
      ] as const;
      for (const field of careerTextFields) {
        const value = source[field];
        if (value !== undefined && (typeof value !== "string" || value.trim().length > 160)) {
          res.status(400).json({ error: `Career preference "${field}" is invalid` }); return;
        }
        if (typeof value === "string" && value.trim()) careerProfile[field] = value.trim();
      }
      for (const field of ["preferredRoles", "workLocations"] as const) {
        const values = source[field];
        if (values !== undefined && (!Array.isArray(values) || values.length > 20
          || values.some((value: unknown) => typeof value !== "string" || !value.trim() || value.trim().length > 120))) {
          res.status(400).json({ error: `Career preference "${field}" is invalid` }); return;
        }
        if (Array.isArray(values)) careerProfile[field] = [...new Set(values.map((value: string) => value.trim()))];
      }
      profile.careerProfile = careerProfile;
    }
    if (input.phone !== undefined && String(input.phone).replace(/\D/g, "").slice(-10) !== req.authUser!.phoneNumber) {
      res.status(400).json({ error: "Use the phone number verified on your account" }); return;
    }
    profile.phone = req.authUser!.phoneNumber || "";
    if (input.contactVisibility !== undefined && !["private", "recruiters"].includes(input.contactVisibility)) {
      res.status(400).json({ error: "Choose a valid contact visibility setting" }); return;
    }
    profile.contactVisibility = input.contactVisibility === "recruiters" ? "recruiters" : "private";
    for (const [field, rowFields, rowLimit] of [
      ["strengths", ["string"], 20],
      ["experiences", ["role", "company", "period"], 20],
      ["educations", ["degree", "school", "period"], 20],
      ["certificates", ["name", "issuer", "year"], 20],
    ] as const) {
      const values = input[field];
      if (values !== undefined && (!Array.isArray(values) || values.length > rowLimit)) {
        res.status(400).json({ error: `Profile field "${field}" is invalid` }); return;
      }
      if (!Array.isArray(values)) continue;
      if (field === "strengths") {
        if (values.some((value) => typeof value !== "string" || !value.trim() || value.trim().length > 80)) {
          res.status(400).json({ error: "Each skill must be between 1 and 80 characters" }); return;
        }
        profile.strengths = [...new Set(values.map((value: string) => value.trim()))];
        continue;
      }
      const normalized = values.map((row: unknown) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return null;
        const record = row as Record<string, unknown>;
        const result: Record<string, string> = {};
        for (const key of rowFields) {
          const value = record[key];
          if (typeof value !== "string" || value.trim().length > 120) return null;
          result[key] = value.trim();
        }
        if (field === "experiences" && record.description !== undefined) {
          if (typeof record.description !== "string" || record.description.trim().length > 1200) return null;
          result.description = record.description.trim();
        }
        return result;
      });
      if (normalized.some((row) => row === null)) { res.status(400).json({ error: `Profile field "${field}" contains invalid entries` }); return; }
      if (field === "experiences") profile.experiences = normalized as SeekerProfileData["experiences"];
      if (field === "educations") profile.educations = normalized as SeekerProfileData["educations"];
      if (field === "certificates") profile.certificates = normalized as SeekerProfileData["certificates"];
    }
    for (const [field, keys] of [
      ["projects", ["name", "role", "period", "description", "url"]],
      ["portfolioLinks", ["title", "type", "url", "description"]],
    ] as const) {
      const values = input[field];
      if (values !== undefined && (!Array.isArray(values) || values.length > 20)) {
        res.status(400).json({ error: `Profile field "${field}" is invalid` }); return;
      }
      if (!Array.isArray(values)) continue;
      const normalized = values.map((row: unknown) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return null;
        const record = row as Record<string, unknown>;
        const result: Record<string, string> = {};
        for (const key of keys) {
          const value = record[key];
          const optional = (field === "projects" && key === "url") || (field === "portfolioLinks" && key === "description");
          if (value === undefined && optional) continue;
          const maxLength = key === "description" ? 1200 : key === "url" ? 500 : 160;
          if (typeof value !== "string" || value.trim().length > maxLength) return null;
          result[key] = value.trim();
        }
        return result;
      });
      if (normalized.some((row) => row === null)) {
        res.status(400).json({ error: `Profile field "${field}" contains invalid entries` }); return;
      }
      if (field === "projects") profile.projects = normalized as SeekerProfileData["projects"];
      if (field === "portfolioLinks") profile.portfolioLinks = normalized as SeekerProfileData["portfolioLinks"];
    }
    if (input.languages !== undefined && (!Array.isArray(input.languages) || input.languages.length > 20)) {
      res.status(400).json({ error: 'Profile field "languages" is invalid' }); return;
    }
    if (Array.isArray(input.languages)) {
      const languages = (input.languages as unknown[]).map((row: unknown) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return null;
        const language = row as Record<string, unknown>;
        if (typeof language.language !== "string" || language.language.trim().length > 80
          || typeof language.proficiency !== "string" || language.proficiency.trim().length > 80
          || typeof language.read !== "boolean" || typeof language.write !== "boolean" || typeof language.speak !== "boolean") return null;
        return {
          language: language.language.trim(),
          proficiency: language.proficiency.trim(),
          read: language.read,
          write: language.write,
          speak: language.speak,
        };
      });
      if (languages.some((language) => language === null)) {
        res.status(400).json({ error: 'Profile field "languages" contains invalid entries' }); return;
      }
      profile.languages = languages as SeekerProfileData["languages"];
    }
    if (input.selectedResumeId !== undefined) {
      if (!["template-modern", "template-classic", "template-minimal", "uploaded"].includes(input.selectedResumeId)) {
        res.status(400).json({ error: "Choose a valid application resume" }); return;
      }
      profile.selectedResumeId = input.selectedResumeId;
    }
    if (input.resumeDocument !== undefined) {
      const document = input.resumeDocument;
      const mimeTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
      ];
      if (!document || typeof document !== "object" || Array.isArray(document)
        || typeof document.name !== "string" || document.name.trim().length < 1 || document.name.length > 255
        || !mimeTypes.includes(document.mimeType)
        || typeof document.dataUrl !== "string"
        || !/^data:(?:application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain|text\/markdown);base64,[A-Za-z0-9+/]+={0,2}$/.test(document.dataUrl)
        || document.dataUrl.length > 1_400_000) {
        res.status(400).json({ error: "Upload a valid PDF, DOCX, or text resume no larger than 1 MB" }); return;
      }
      profile.resumeDocument = { name: document.name.trim(), mimeType: document.mimeType, dataUrl: document.dataUrl };
    }
    if (input.resumeTemplateContent !== undefined) {
      const templateContent = input.resumeTemplateContent;
      const templateIds = ["template-modern", "template-classic", "template-minimal"];
      if (!templateContent || typeof templateContent !== "object" || Array.isArray(templateContent)
        || Object.keys(templateContent).some((key) => !templateIds.includes(key))) {
        res.status(400).json({ error: "Resume template content is invalid" }); return;
      }
      const validated: NonNullable<SeekerProfileData["resumeTemplateContent"]> = {};
      for (const templateId of templateIds) {
        const candidate = templateContent[templateId];
        if (candidate === undefined) continue;
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
          res.status(400).json({ error: "Resume template content is invalid" }); return;
        }
        const content = candidate as Record<string, unknown>;
        const stringFields = ["name", "email", "phone", "headline", "location"] as const;
        if (stringFields.some((field) => typeof content[field] !== "string" || (content[field] as string).length > 255)) {
          res.status(400).json({ error: "Resume template contact and headline fields are invalid" }); return;
        }
        const readRows = (field: "experiences" | "educations" | "certificates", keys: string[]) => {
          const rows = content[field];
          if (!Array.isArray(rows) || rows.length > 20) return null;
          const output: Array<Record<string, string>> = [];
          for (const row of rows) {
            if (!row || typeof row !== "object" || Array.isArray(row)) return null;
            const result: Record<string, string> = {};
            for (const key of keys) {
              const value = (row as Record<string, unknown>)[key];
              if (typeof value !== "string" || value.length > 255) return null;
              result[key] = value;
            }
            output.push(result);
          }
          return output;
        };
        const strengths = content.strengths;
        const experiences = readRows("experiences", ["role", "company", "period"]);
        const educations = readRows("educations", ["degree", "school", "period"]);
        const certificates = readRows("certificates", ["name", "issuer", "year"]);
        if (!Array.isArray(strengths) || strengths.length > 20
          || strengths.some((item) => typeof item !== "string" || item.length > 80)
          || !experiences || !educations || !certificates) {
          res.status(400).json({ error: "Resume template sections are invalid" }); return;
        }
        validated[templateId as keyof typeof validated] = {
          name: content.name as string,
          email: content.email as string,
          phone: content.phone as string,
          headline: content.headline as string,
          location: content.location as string,
          strengths: strengths as string[],
          experiences: experiences as ResumeTemplateContent["experiences"],
          educations: educations as ResumeTemplateContent["educations"],
          certificates: certificates as ResumeTemplateContent["certificates"],
        };
      }
      profile.resumeTemplateContent = validated;
    }
    const [updated] = await db.update(users)
      .set({ name, email, profileData: profile, city: profile.city || null })
      .where(eq(users.id, req.authUser!.id))
      .returning({ name: users.name, email: users.email, profileData: users.profileData, phoneNumber: users.phoneNumber });
    res.json({ profile: { ...(updated?.profileData || {}), phone: updated?.phoneNumber || "" } });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") { res.status(409).json({ error: "An account already uses that email address" }); return; }
    next(error);
  }
});

router.get("/companies/me", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "recruiter") { res.status(403).json({ error: "Recruiter access required" }); return; }
    let [company] = await db.select().from(companies).where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
    if (!company) {
      [company] = await db.insert(companies).values({
        name: req.authUser!.name,
        recruiterContactName: req.authUser!.name,
        industry: "Not specified",
        city: "Not specified",
        recruiterId: req.authUser!.id,
      }).returning();
    }
    res.json({ company });
  } catch (error) { next(error); }
});

router.get("/companies/:companyId/profile", async (req, res, next) => {
  try {
    const companyId = String(req.params.companyId);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId)) {
      res.status(404).json({ error: "Company profile not found" }); return;
    }
    const [company] = await db.select({
      id: companies.id,
      name: companies.name,
      industry: companies.industry,
      city: companies.city,
      address: companies.address,
      website: companies.website,
      description: companies.description,
      size: companies.size,
      founded: companies.founded,
      logoUrl: companies.logoUrl,
      coverUrl: companies.coverUrl,
    }).from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.verificationStatus, "verified")))
      .limit(1);
    if (!company) { res.status(404).json({ error: "Company profile not found" }); return; }
    res.json({ company });
  } catch (error) { next(error); }
});

router.patch("/companies/me", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "recruiter") { res.status(403).json({ error: "Recruiter access required" }); return; }
    const input = req.body?.company;
    if (!input || typeof input !== "object" || Array.isArray(input)) { res.status(400).json({ error: "A valid company profile is required" }); return; }
    const name = String(input.name || "").trim();
    const industry = String(input.industry || "").trim();
    const website = String(input.website || "").trim();
    const description = String(input.description || "").trim();
    const city = String(input.city || "").trim();
    const size = String(input.size || "").trim();
    const founded = String(input.founded || "").trim();
    const contactEmail = String(input.contactEmail || req.authUser!.email).trim().toLowerCase();
    const phone = String(input.phone || "").trim();
    const address = String(input.address || "").trim();
    const recruiterContactName = String(input.recruiterName ?? input.recruiterContactName ?? req.authUser!.name).trim();
    const gstNumber = String(input.gstNumber || "").trim().toUpperCase();
    const panNumber = String(input.panNumber || "").trim().toUpperCase();
    const msmeNumber = String(input.msmeNumber || "").trim().toUpperCase();
    const logoUrl = String(input.logoUrl || "").trim();
    const coverUrl = String(input.coverUrl || "").trim();
    let parsedWebsite: URL;
    try { parsedWebsite = new URL(website); } catch { res.status(400).json({ error: "Enter a valid company website URL" }); return; }
    if (name.length < 2 || name.length > 160 || industry.length < 2 || industry.length > 120 || description.length < 20 || description.length > 5000) {
      res.status(400).json({ error: "Company name, industry, and a 20-5,000 character description are required" }); return;
    }
    if (!["http:", "https:"].includes(parsedWebsite.protocol) || !parsedWebsite.hostname.includes(".") || website.length > 255) {
      res.status(400).json({ error: "Enter a valid company website URL" }); return;
    }
    if (city.length > 100 || size.length > 40 || address.length > 400 || recruiterContactName.length < 2 || recruiterContactName.length > 120 || (founded && (!/^\d{4}$/.test(founded) || Number(founded) < 1800 || Number(founded) > new Date().getFullYear()))) {
      res.status(400).json({ error: "Company location, size, or founded year is invalid" }); return;
    }
    if (!emailPattern.test(contactEmail) || contactEmail.length > 255) { res.status(400).json({ error: "Enter a valid company contact email" }); return; }
    if (phone && !/^[+\d][\d\s().-]{7,29}$/.test(phone)) { res.status(400).json({ error: "Enter a valid company phone number" }); return; }
    if (gstNumber && !/^[0-9A-Z]{15}$/.test(gstNumber)) { res.status(400).json({ error: "Enter a valid 15-character GSTIN" }); return; }
    if (panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber)) { res.status(400).json({ error: "Enter a valid 10-character PAN number" }); return; }
    if (msmeNumber && !/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(msmeNumber)) { res.status(400).json({ error: "Enter a valid Udyam registration number" }); return; }
    if (logoUrl.startsWith("data:")) {
      if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logoUrl) || logoUrl.length > 1_400_000) {
        res.status(400).json({ error: "Upload a PNG, JPEG, or WebP company logo no larger than 1 MB" }); return;
      }
    }
    for (const imageUrl of [logoUrl.startsWith("data:") ? "" : logoUrl, coverUrl]) {
      if (!imageUrl) continue;
      try {
        const parsed = new URL(imageUrl);
        if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".") || imageUrl.length > 2048) throw new Error();
      } catch {
        res.status(400).json({ error: "Enter valid HTTPS or HTTP image URLs for the company logo and cover" }); return;
      }
    }
    const [existing] = await db.select()
      .from(companies).where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
    const profileChanged = Boolean(existing && (
      existing.name !== name || existing.industry !== industry || existing.website !== website ||
      existing.description !== description || existing.city !== (city || "Not specified") ||
      existing.address !== (address || null) || existing.recruiterContactName !== recruiterContactName ||
      existing.size !== (size || null) || existing.founded !== (founded || null) ||
      existing.contactEmail !== contactEmail || existing.phone !== (phone || null) ||
      existing.gstNumber !== (gstNumber || null) || existing.panNumber !== (panNumber || null) ||
      existing.msmeNumber !== (msmeNumber || null) || existing.logoUrl !== (logoUrl || null) ||
      existing.coverUrl !== (coverUrl || null)
    ));
    const verificationReset = Boolean(
      existing && profileChanged &&
      ["verified", "pending", "rejected"].includes(existing.verificationStatus),
    );
    const { company, user } = await db.transaction(async (transaction) => {
      const [updatedUser] = await transaction.update(users)
        .set({ email: contactEmail })
        .where(eq(users.id, req.authUser!.id))
        .returning();
      const [updatedCompany] = existing
        ? await transaction.update(companies).set({
            name, recruiterContactName, industry, website, description, city: city || "Not specified",
            address: address || null,
            size: size || null, founded: founded || null, contactEmail,
            phone: phone || null, gstNumber: gstNumber || null, panNumber: panNumber || null,
            msmeNumber: msmeNumber || null, logoUrl: logoUrl || null, coverUrl: coverUrl || null,
            verificationStatus: verificationReset ? "incomplete" : existing.verificationStatus,
          }).where(eq(companies.id, existing.id)).returning()
        : await transaction.insert(companies).values({
            name, recruiterContactName, industry, website, description, city: city || "Not specified",
            address: address || null,
            size: size || null, founded: founded || null, contactEmail,
            phone: phone || null, gstNumber: gstNumber || null, panNumber: panNumber || null,
            msmeNumber: msmeNumber || null, logoUrl: logoUrl || null, coverUrl: coverUrl || null,
            recruiterId: req.authUser!.id,
          }).returning();
      if (verificationReset && existing) {
        await transaction.update(companyVerificationDocuments).set({
          status: "pending", reviewerId: null, reviewerNote: null, reviewedAt: null,
        }).where(eq(companyVerificationDocuments.companyId, existing.id));
      }
      return { company: updatedCompany, user: updatedUser };
    });
    res.json({ company, user: publicUser(user!), verificationReset });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") { res.status(409).json({ error: "An account already uses that email address" }); return; }
    next(error);
  }
});

router.get("/companies/me/verification-documents", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "recruiter") { res.status(403).json({ error: "Recruiter access required" }); return; }
    const [company] = await db.select({ id: companies.id }).from(companies)
      .where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
    if (!company) { res.status(404).json({ error: "Complete your company profile before uploading documents" }); return; }
    const documents = await db.select({
      id: companyVerificationDocuments.id,
      documentType: companyVerificationDocuments.documentType,
      fileName: companyVerificationDocuments.fileName,
      mimeType: companyVerificationDocuments.mimeType,
      fileSize: companyVerificationDocuments.fileSize,
      status: companyVerificationDocuments.status,
      reviewerNote: companyVerificationDocuments.reviewerNote,
      submittedAt: companyVerificationDocuments.submittedAt,
      reviewedAt: companyVerificationDocuments.reviewedAt,
    }).from(companyVerificationDocuments)
      .where(eq(companyVerificationDocuments.companyId, company.id));
    res.json({ documents });
  } catch (error) { next(error); }
});

router.put("/companies/me/verification-documents/:documentType", requireAuth, express.raw({
  type: [...verificationMimeTypes],
  limit: "5mb",
}), async (req, res, next) => {
  try {
    if (req.authUser!.role !== "recruiter") { res.status(403).json({ error: "Recruiter access required" }); return; }
    const documentType = String(req.params.documentType);
    if (!verificationDocumentTypes.includes(documentType as typeof verificationDocumentTypes[number])) {
      res.status(400).json({ error: "Choose GST, PAN, MSME, offer letter, or other document type" }); return;
    }
    const mimeType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (!verificationMimeTypes.has(mimeType)) { res.status(415).json({ error: "Upload a PDF, JPEG, PNG, or WebP document" }); return; }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0 || req.body.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: "The document is empty or exceeds the 5 MB limit" }); return;
    }
    let fileName: string;
    try {
      fileName = decodeURIComponent(String(req.headers["x-file-name"] || "verification-document")).trim().slice(0, 255);
    } catch {
      res.status(400).json({ error: "Document filename is invalid" }); return;
    }
    if (!fileName || /[\\/\0]/.test(fileName)) { res.status(400).json({ error: "Provide a valid document filename" }); return; }
    const [company] = await db.select({ id: companies.id, verificationStatus: companies.verificationStatus }).from(companies)
      .where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
    if (!company) { res.status(404).json({ error: "Complete your company profile before uploading documents" }); return; }
    if (company.verificationStatus === "pending") {
      res.status(409).json({ error: "Your company verification is in review; wait for the admin decision before changing documents" }); return;
    }
    const [previous] = await db.select({ id: companyVerificationDocuments.id }).from(companyVerificationDocuments)
      .where(and(
        eq(companyVerificationDocuments.companyId, company.id),
        eq(companyVerificationDocuments.documentType, documentType),
      )).limit(1);
    const [document] = previous
      ? await db.update(companyVerificationDocuments).set({
          fileName, mimeType, fileSize: req.body.length, fileData: req.body,
          status: "pending", reviewerId: null, reviewerNote: null, reviewedAt: null, submittedAt: new Date(),
        }).where(eq(companyVerificationDocuments.id, previous.id)).returning({
          id: companyVerificationDocuments.id,
          documentType: companyVerificationDocuments.documentType,
          fileName: companyVerificationDocuments.fileName,
          mimeType: companyVerificationDocuments.mimeType,
          fileSize: companyVerificationDocuments.fileSize,
          status: companyVerificationDocuments.status,
          reviewerNote: companyVerificationDocuments.reviewerNote,
          submittedAt: companyVerificationDocuments.submittedAt,
          reviewedAt: companyVerificationDocuments.reviewedAt,
        })
      : await db.insert(companyVerificationDocuments).values({
          companyId: company.id, documentType, fileName, mimeType,
          fileSize: req.body.length, fileData: req.body,
        }).returning({
          id: companyVerificationDocuments.id,
          documentType: companyVerificationDocuments.documentType,
          fileName: companyVerificationDocuments.fileName,
          mimeType: companyVerificationDocuments.mimeType,
          fileSize: companyVerificationDocuments.fileSize,
          status: companyVerificationDocuments.status,
          reviewerNote: companyVerificationDocuments.reviewerNote,
          submittedAt: companyVerificationDocuments.submittedAt,
          reviewedAt: companyVerificationDocuments.reviewedAt,
        });
    await db.update(companies).set({ verificationStatus: "incomplete" }).where(eq(companies.id, company.id));
    res.status(201).json({ document });
  } catch (error) {
    if ((error as { type?: string }).type === "entity.too.large") { res.status(413).json({ error: "Documents must be 5 MB or smaller" }); return; }
    next(error);
  }
});

router.post("/companies/me/verification/submit", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role !== "recruiter") { res.status(403).json({ error: "Recruiter access required" }); return; }
    const documentType = String(req.body?.documentType || "");
    if (!verificationDocumentTypes.includes(documentType as typeof verificationDocumentTypes[number])) {
      res.status(400).json({ error: "Select GST, PAN, MSME, offer letter, or another valid business document type" }); return;
    }
    const [company] = await db.select().from(companies).where(eq(companies.recruiterId, req.authUser!.id)).limit(1);
    if (!company) { res.status(404).json({ error: "Complete your company profile before submitting verification" }); return; }
    if (!company.name || company.industry === "Not specified" || !company.website || !company.description ||
        !company.contactEmail || !company.phone) {
      res.status(400).json({ error: "Complete the required company details and contact information before submitting" }); return;
    }
    if (documentType === "gst" && !/^[0-9A-Z]{15}$/.test(company.gstNumber || "")) {
      res.status(400).json({ error: "Enter a valid 15-character GSTIN before submitting its verification document" }); return;
    }
    if (documentType === "pan" && !/^[A-Z]{5}\d{4}[A-Z]$/.test(company.panNumber || "")) {
      res.status(400).json({ error: "Enter a valid 10-character PAN number before submitting its verification document" }); return;
    }
    if (documentType === "msme" && !/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(company.msmeNumber || "")) {
      res.status(400).json({ error: "Enter a valid Udyam registration number before submitting its verification document" }); return;
    }
    const [selectedDocument] = await db.select({ id: companyVerificationDocuments.id })
      .from(companyVerificationDocuments)
      .where(and(
        eq(companyVerificationDocuments.companyId, company.id),
        eq(companyVerificationDocuments.documentType, documentType),
      )).limit(1);
    if (!selectedDocument) {
      res.status(400).json({ error: "Upload the selected business verification document before submitting" }); return;
    }
    await db.transaction(async (transaction) => {
      await transaction.delete(companyVerificationDocuments).where(and(
        eq(companyVerificationDocuments.companyId, company.id),
        ne(companyVerificationDocuments.documentType, documentType),
      ));
      await transaction.update(companies).set({ verificationStatus: "pending" })
        .where(eq(companies.id, company.id));
    });
    res.json({ verificationStatus: "pending" });
  } catch (error) { next(error); }
});

router.get("/admin/company-verifications", requireAuth, async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const rows = await db.select({
      company: companies,
      recruiterName: companies.recruiterContactName,
      recruiterEmail: users.email,
    }).from(companies).innerJoin(users, eq(companies.recruiterId, users.id));
    const items = await Promise.all(rows.map(async ({ company, recruiterName, recruiterEmail }) => ({
      company: { ...company, recruiterId: undefined },
      recruiterName,
      recruiterEmail,
      documents: await db.select({
        id: companyVerificationDocuments.id,
        documentType: companyVerificationDocuments.documentType,
        fileName: companyVerificationDocuments.fileName,
        mimeType: companyVerificationDocuments.mimeType,
        fileSize: companyVerificationDocuments.fileSize,
        status: companyVerificationDocuments.status,
        reviewerNote: companyVerificationDocuments.reviewerNote,
        submittedAt: companyVerificationDocuments.submittedAt,
        reviewedAt: companyVerificationDocuments.reviewedAt,
      }).from(companyVerificationDocuments)
        .where(eq(companyVerificationDocuments.companyId, company.id)),
    })));
    res.json({ companies: items });
  } catch (error) { next(error); }
});

router.get("/admin/company-verifications/:documentId/file", requireAuth, async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [document] = await db.select({
      fileName: companyVerificationDocuments.fileName,
      mimeType: companyVerificationDocuments.mimeType,
      fileData: companyVerificationDocuments.fileData,
    }).from(companyVerificationDocuments)
      .where(eq(companyVerificationDocuments.id, String(req.params.documentId))).limit(1);
    if (!document) { res.status(404).json({ error: "Verification document not found" }); return; }
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${document.fileName.replace(/["\\\r\n]/g, "_")}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
    res.send(document.fileData);
  } catch (error) { next(error); }
});

router.patch("/admin/company-verifications/:companyId/documents/:documentId", requireAuth, async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = req.body?.status;
    const reviewerNote = String(req.body?.reviewerNote || "").trim().slice(0, 1000);
    if (!["verified", "rejected"].includes(status)) { res.status(400).json({ error: "Choose verified or rejected" }); return; }
    const [company] = await db.select({ verificationStatus: companies.verificationStatus })
      .from(companies).where(eq(companies.id, String(req.params.companyId))).limit(1);
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }
    if (company.verificationStatus !== "pending") {
      res.status(409).json({ error: "Documents can only be reviewed after the company submits its verification" }); return;
    }
    const [document] = await db.update(companyVerificationDocuments).set({
      status,
      reviewerId: req.authUser!.id,
      reviewerNote: reviewerNote || null,
      reviewedAt: new Date(),
    }).where(and(
      eq(companyVerificationDocuments.id, String(req.params.documentId)),
      eq(companyVerificationDocuments.companyId, String(req.params.companyId)),
    )).returning({ id: companyVerificationDocuments.id });
    if (!document) { res.status(404).json({ error: "Verification document not found" }); return; }
    if (status === "rejected") {
      const remainingVerified = await db.select({ id: companyVerificationDocuments.id })
        .from(companyVerificationDocuments)
        .where(and(
          eq(companyVerificationDocuments.companyId, String(req.params.companyId)),
          eq(companyVerificationDocuments.status, "verified"),
        ));
      if (remainingVerified.length === 0) {
        await db.update(companies).set({ verificationStatus: "rejected" })
          .where(eq(companies.id, String(req.params.companyId)));
      }
    }
    res.json({ document: { id: document.id, status } });
  } catch (error) { next(error); }
});

router.post("/admin/company-verifications/:companyId/approve", requireAuth, async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const companyId = String(req.params.companyId);
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }
    if (company.verificationStatus !== "pending") { res.status(409).json({ error: "Company must submit its verification profile before approval" }); return; }
    const documents = await db.select({
      type: companyVerificationDocuments.documentType,
      status: companyVerificationDocuments.status,
    }).from(companyVerificationDocuments).where(eq(companyVerificationDocuments.companyId, companyId));
    const hasVerifiedDocument = documents.some((document) => document.status === "verified");
    if (!hasVerifiedDocument) {
      res.status(400).json({ error: "Verify at least one business document before approving this company" }); return;
    }
    const [updated] = await db.update(companies).set({ verificationStatus: "verified" })
      .where(eq(companies.id, companyId)).returning({ verificationStatus: companies.verificationStatus });
    res.json({ verificationStatus: updated.verificationStatus });
  } catch (error) { next(error); }
});

export default router;
