ALTER TABLE "messages" ADD COLUMN "from_public_key" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "to_public_key" text;
