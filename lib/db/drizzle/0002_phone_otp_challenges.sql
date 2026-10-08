CREATE TABLE IF NOT EXISTS "phone_otp_challenges" (
	"phone_number" varchar(10) PRIMARY KEY NOT NULL,
	"purpose" varchar(12) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_otp_challenges_expiry_idx" ON "phone_otp_challenges" USING btree ("expires_at");