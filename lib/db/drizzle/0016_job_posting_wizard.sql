ALTER TABLE "jobs" ADD COLUMN "details" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
CREATE TABLE "job_posting_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recruiter_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "current_step" integer DEFAULT 1 NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "job_posting_drafts_current_step_check" CHECK ("current_step" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE INDEX "job_posting_drafts_recruiter_updated_idx" ON "job_posting_drafts" USING btree ("recruiter_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "job_posting_drafts_company_idx" ON "job_posting_drafts" USING btree ("company_id");
