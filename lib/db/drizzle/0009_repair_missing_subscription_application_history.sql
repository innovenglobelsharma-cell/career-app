CREATE TABLE IF NOT EXISTS "subscriptions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan" varchar(40) NOT NULL,
	"status" varchar(20) NOT NULL,
	"payment_verified" boolean DEFAULT false NOT NULL,
	"provider" varchar(40),
	"provider_payment_id" varchar(255),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_provider_payment_id_unique" UNIQUE("provider_payment_id"),
	CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status", "ends_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status" NOT NULL,
	"changed_by_id" uuid NOT NULL,
	"actor_role" "user_role" NOT NULL,
	"note" varchar(1000),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_status_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "application_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_status_history_application_idx" ON "application_status_history" USING btree ("application_id", "changed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_status_history_actor_idx" ON "application_status_history" USING btree ("changed_by_id");
--> statement-breakpoint
INSERT INTO "application_status_history" (
	"application_id", "from_status", "to_status", "changed_by_id", "actor_role", "changed_at"
)
SELECT
	application."id", NULL, application."status", application."seeker_id", 'job_seeker', application."applied_at"
FROM "applications" AS application
WHERE NOT EXISTS (
	SELECT 1
	FROM "application_status_history" AS history
	WHERE history."application_id" = application."id"
);