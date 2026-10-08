CREATE TABLE "company_verification_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_type" varchar(24) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"file_data" "bytea" NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"reviewer_note" varchar(1000),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "pan_number" varchar(10);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "msme_number" varchar(19);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "verification_status" varchar(20) DEFAULT 'incomplete' NOT NULL;--> statement-breakpoint
ALTER TABLE "company_verification_documents" ADD CONSTRAINT "company_verification_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_verification_documents" ADD CONSTRAINT "company_verification_documents_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_verification_documents_company_idx" ON "company_verification_documents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_verification_documents_status_idx" ON "company_verification_documents" USING btree ("status");