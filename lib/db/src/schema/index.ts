import { sql } from "drizzle-orm";
import { boolean, check, customType, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export type ResumeTemplateContent = {
  name: string;
  email: string;
  phone: string;
  headline: string;
  location: string;
  strengths: string[];
  experiences: Array<{ role: string; company: string; period: string }>;
  educations: Array<{ degree: string; school: string; period: string }>;
  certificates: Array<{ name: string; issuer: string; year: string }>;
};
export type SeekerProfileData = {
  gender?: "Female" | "Male" | "Non-binary" | "Prefer not to say";
  age?: number;
  englishLevel?: "Basic" | "Conversational" | "Intermediate" | "Fluent" | "Professional" | "Native";
  totalExperience?: string;
  headline?: string;
  location?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  contactVisibility?: "private" | "recruiters";
  strengths?: string[];
  summary?: string;
  careerProfile?: {
    industry?: string;
    department?: string;
    roleCategory?: string;
    jobRole?: string;
    jobType?: string;
    employmentType?: string;
    preferredRoles?: string[];
    workLocations?: string[];
    expectedSalary?: string;
    shift?: string;
    noticePeriod?: string;
  };
  educations?: Array<{ degree: string; school: string; period: string }>;
  experiences?: Array<{ role: string; company: string; period: string; description?: string }>;
  certificates?: Array<{ name: string; issuer: string; year: string }>;
  languages?: Array<{ language: string; proficiency: string; read: boolean; write: boolean; speak: boolean }>;
  projects?: Array<{ name: string; role: string; period: string; description: string; url?: string }>;
  portfolioLinks?: Array<{ title: string; type: string; url: string; description?: string }>;
  resumeName?: string;
  selectedResumeId?: "template-modern" | "template-classic" | "template-minimal" | "uploaded";
  resumeDocument?: { name: string; mimeType: string; dataUrl: string };
  resumeTemplateContent?: Partial<Record<"template-modern" | "template-classic" | "template-minimal", ResumeTemplateContent>>;
};

export type ApplicationResumeSnapshot = {
  selectedResumeId: "template-modern" | "template-classic" | "template-minimal" | "uploaded";
  selectedResumeName: string;
  templateContent?: ResumeTemplateContent;
  profile: Omit<SeekerProfileData, "resumeDocument"> & {
    resumeDocument?: { name: string; mimeType: string; dataUrl?: string };
  };
};

export const userRole = pgEnum("user_role", ["job_seeker", "recruiter", "support", "admin"]);
export const jobStatus = pgEnum("job_status", ["draft", "pending", "active", "paused", "closed"]);
export const applicationStatus = pgEnum("application_status", ["applied", "viewed", "shortlisted", "interview", "selected", "rejected", "withdrawn"]);
export const ticketStatus = pgEnum("ticket_status", ["open", "in_progress", "waiting_for_user", "resolved", "closed"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phoneNumber: varchar("phone_number", { length: 10 }).unique(),
  // SPKI-encoded ECDH public key. Private keys never leave the user's browser.
  encryptionPublicKey: text("encryption_public_key"),
  encryptionKeyBackup: text("encryption_key_backup"),
  role: userRole("role").notNull(),
  city: varchar("city", { length: 100 }),
  profileData: jsonb("profile_data").$type<SeekerProfileData>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expiry_idx").on(table.expiresAt)]);

export const passwordResetOtps = pgTable("password_reset_otps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("password_reset_otps_user_unique").on(table.userId), index("password_reset_otps_expiry_idx").on(table.expiresAt)]);

export const phoneOtpChallenges = pgTable("phone_otp_challenges", {
  phoneNumber: varchar("phone_number", { length: 10 }).primaryKey(),
  purpose: varchar("purpose", { length: 12 }).notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("phone_otp_challenges_expiry_idx").on(table.expiresAt)]);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  industry: varchar("industry", { length: 120 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  address: varchar("address", { length: 400 }),
  website: varchar("website", { length: 255 }),
  description: text("description"),
  size: varchar("size", { length: 40 }),
  founded: varchar("founded", { length: 4 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  recruiterContactName: varchar("recruiter_contact_name", { length: 120 }).notNull(),
  gstNumber: varchar("gst_number", { length: 15 }),
  panNumber: varchar("pan_number", { length: 10 }),
  msmeNumber: varchar("msme_number", { length: 19 }),
  logoUrl: text("logo_url"),
  coverUrl: varchar("cover_url", { length: 2048 }),
  verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("incomplete"),
  recruiterId: uuid("recruiter_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const companyVerificationDocuments = pgTable("company_verification_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  documentType: varchar("document_type", { length: 24 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: bytea("file_data").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  reviewerNote: varchar("reviewer_note", { length: 1000 }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => [
  index("company_verification_documents_company_idx").on(table.companyId),
  index("company_verification_documents_status_idx").on(table.status),
]);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("Other"),
  location: varchar("location", { length: 140 }).notNull(),
  workMode: varchar("work_mode", { length: 30 }).notNull(),
  employmentType: varchar("employment_type", { length: 40 }).notNull(),
  experience: varchar("experience", { length: 80 }).notNull(),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  description: text("description").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  skills: text("skills").array().notNull().default([]),
  status: jobStatus("status").notNull().default("pending"),
  placement: varchar("placement", { length: 20 }).notNull().default("normal"),
  views: integer("views").notNull().default(0),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("jobs_company_idx").on(table.companyId), index("jobs_status_idx").on(table.status)]);

export const jobPostingDrafts = pgTable("job_posting_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  recruiterId: uuid("recruiter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  currentStep: integer("current_step").notNull().default(1),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("job_posting_drafts_recruiter_updated_idx").on(table.recruiterId, table.updatedAt),
  index("job_posting_drafts_company_idx").on(table.companyId),
  check("job_posting_drafts_current_step_check", sql`${table.currentStep} BETWEEN 1 AND 5`),
]);

export const jobPostingFeedback = pgTable("job_posting_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }).notNull().unique(),
  recruiterId: uuid("recruiter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  feedback: varchar("feedback", { length: 2000 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("job_posting_feedback_recruiter_idx").on(table.recruiterId),
  index("job_posting_feedback_created_idx").on(table.createdAt),
]);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  seekerId: uuid("seeker_id").references(() => users.id).notNull(),
  status: applicationStatus("status").notNull().default("applied"),
  coverNote: text("cover_note"),
  resumeSnapshot: jsonb("resume_snapshot").$type<ApplicationResumeSnapshot>(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("applications_seeker_idx").on(table.seekerId), index("applications_job_idx").on(table.jobId), uniqueIndex("applications_job_seeker_unique").on(table.jobId, table.seekerId)]);

export const applicationStatusHistory = pgTable("application_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
  fromStatus: applicationStatus("from_status"),
  toStatus: applicationStatus("to_status").notNull(),
  changedById: uuid("changed_by_id").references(() => users.id).notNull(),
  actorRole: userRole("actor_role").notNull(),
  note: varchar("note", { length: 1000 }),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("application_status_history_application_idx").on(table.applicationId, table.changedAt),
  index("application_status_history_actor_idx").on(table.changedById),
]);

export const subscriptions = pgTable("subscriptions", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 40 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  paymentVerified: boolean("payment_verified").notNull().default(false),
  provider: varchar("provider", { length: 40 }),
  providerPaymentId: varchar("provider_payment_id", { length: 255 }).unique(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("subscriptions_status_idx").on(table.status, table.endsAt)]);

export const subscriptionPlanPrices = pgTable("subscription_plan_prices", {
  plan: varchar("plan", { length: 40 }).primaryKey(),
  audience: varchar("audience", { length: 20 }).notNull(),
  monthlyPrice: integer("monthly_price").notNull(),
  yearlyPrice: integer("yearly_price").notNull(),
  description: text("description").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  maxActiveJobs: integer("max_active_jobs"),
  maxMonthlyApplications: integer("max_monthly_applications"),
  canFeatureJobs: boolean("can_feature_jobs").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("subscription_plan_prices_audience_idx").on(table.audience)]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: varchar("conversation_id", { length: 80 }).notNull(),
  fromUserId: uuid("from_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  toUserId: uuid("to_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  body: text("body").notNull(),
  bodyHash: varchar("body_hash", { length: 64 }).notNull(),
  serverBody: text("server_body"),
  serverBodyHash: varchar("server_body_hash", { length: 64 }),
  fromPublicKey: text("from_public_key"),
  toPublicKey: text("to_public_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (table) => [
  index("messages_conversation_idx").on(table.conversationId, table.createdAt),
  index("messages_from_idx").on(table.fromUserId),
  index("messages_to_idx").on(table.toUserId),
]);

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  openedById: uuid("opened_by_id").references(() => users.id).notNull(),
  assignedToId: uuid("assigned_to_id").references(() => users.id),
  subject: varchar("subject", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  status: ticketStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
