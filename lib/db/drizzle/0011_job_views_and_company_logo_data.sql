ALTER TABLE "companies" ALTER COLUMN "logo_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "views" integer DEFAULT 0 NOT NULL;