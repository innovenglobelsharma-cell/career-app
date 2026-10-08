ALTER TABLE "companies" ADD COLUMN "size" varchar(40);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "founded" varchar(4);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone" varchar(30);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "gst_number" varchar(15);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_data" jsonb;