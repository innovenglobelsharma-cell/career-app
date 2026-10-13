ALTER TABLE "companies" ADD COLUMN "recruiter_contact_name" varchar(120);
--> statement-breakpoint
UPDATE "companies"
SET "recruiter_contact_name" = "users"."name"
FROM "users"
WHERE "companies"."recruiter_id" = "users"."id";
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "recruiter_contact_name" SET NOT NULL;
