CREATE TABLE "job_posting_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL UNIQUE REFERENCES "jobs"("id") ON DELETE CASCADE,
  "recruiter_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "feedback" varchar(2000) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "job_posting_feedback_recruiter_idx" ON "job_posting_feedback" USING btree ("recruiter_id");
--> statement-breakpoint
CREATE INDEX "job_posting_feedback_created_idx" ON "job_posting_feedback" USING btree ("created_at");
