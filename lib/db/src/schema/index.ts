import { customType, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export type SeekerProfileData = {
  headline?: string;
  location?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  contactVisibility?: "private" | "recruiters";
  strengths?: string[];
  educations?: Array<{ degree: string; school: string; period: string }>;
  experiences?: Array<{ role: string; company: string; period: string }>;
  certificates?: Array<{ name: string; issuer: string; year: string }>;
  resumeName?: string;
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
  website: varchar("website", { length: 255 }),
  description: text("description"),
  size: varchar("size", { length: 40 }),
  founded: varchar("founded", { length: 4 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  gstNumber: varchar("gst_number", { length: 15 }),
  panNumber: varchar("pan_number", { length: 10 }),
  msmeNumber: varchar("msme_number", { length: 19 }),
  logoUrl: varchar("logo_url", { length: 2048 }),
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
  skills: text("skills").array().notNull().default([]),
  status: jobStatus("status").notNull().default("pending"),
  placement: varchar("placement", { length: 20 }).notNull().default("normal"),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("jobs_company_idx").on(table.companyId), index("jobs_status_idx").on(table.status)]);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  seekerId: uuid("seeker_id").references(() => users.id).notNull(),
  status: applicationStatus("status").notNull().default("applied"),
  coverNote: text("cover_note"),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("applications_seeker_idx").on(table.seekerId), index("applications_job_idx").on(table.jobId), uniqueIndex("applications_job_seeker_unique").on(table.jobId, table.seekerId)]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: varchar("conversation_id", { length: 80 }).notNull(),
  fromUserId: uuid("from_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  toUserId: uuid("to_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  body: text("body").notNull(),
  bodyHash: varchar("body_hash", { length: 64 }).notNull(),
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
