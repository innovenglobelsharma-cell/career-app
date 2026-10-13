CREATE TABLE "subscription_plan_prices" (
  "plan" varchar(40) PRIMARY KEY NOT NULL,
  "audience" varchar(20) NOT NULL,
  "monthly_price" integer NOT NULL,
  "yearly_price" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "subscription_plan_prices_audience_idx" ON "subscription_plan_prices" USING btree ("audience");
--> statement-breakpoint
INSERT INTO "subscription_plan_prices" ("plan", "audience", "monthly_price", "yearly_price") VALUES
  ('Hiring Plus', 'recruiter', 1499, 1199),
  ('Hiring Pro', 'recruiter', 2999, 2399),
  ('Career Plus', 'job_seeker', 599, 399),
  ('Career Pro', 'job_seeker', 999, 799);