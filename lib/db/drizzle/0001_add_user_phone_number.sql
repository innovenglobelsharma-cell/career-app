ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" varchar(10);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_phone_number_unique'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number");
  END IF;
END $$;
