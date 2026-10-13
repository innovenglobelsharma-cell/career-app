ALTER TABLE "subscription_plan_prices" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plan_prices" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plan_prices" ADD COLUMN "max_active_jobs" integer;--> statement-breakpoint
ALTER TABLE "subscription_plan_prices" ADD COLUMN "max_monthly_applications" integer;--> statement-breakpoint
ALTER TABLE "subscription_plan_prices" ADD COLUMN "can_feature_jobs" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plan_prices" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "subscription_plan_prices" SET
  "description" = CASE "plan"
    WHEN 'Hiring Plus' THEN 'For teams hiring consistently.'
    WHEN 'Hiring Pro' THEN 'For growing recruiting teams.'
    WHEN 'Career Plus' THEN 'For serious job seekers who want better matches.'
    WHEN 'Career Pro' THEN 'For maximum visibility and guided progress.'
    ELSE "description"
  END,
  "features" = CASE "plan"
    WHEN 'Hiring Plus' THEN '["10 active jobs (server enforced)","Featured placement with verified payment","Priority support"]'::jsonb
    WHEN 'Hiring Pro' THEN '["Unlimited active jobs","5 recruiter seats","Advanced hiring analytics","Dedicated support"]'::jsonb
    WHEN 'Career Plus' THEN '["Unlimited applications","AI-powered match ranking","Priority profile visibility","Advanced salary insights"]'::jsonb
    WHEN 'Career Pro' THEN '["Everything in Career Plus","Featured candidate badge","Recruiter profile insights","Monthly profile review"]'::jsonb
    ELSE "features"
  END,
  "max_active_jobs" = CASE "plan" WHEN 'Hiring Plus' THEN 10 WHEN 'Hiring Pro' THEN NULL ELSE "max_active_jobs" END,
  "max_monthly_applications" = CASE "plan" WHEN 'Career Plus' THEN NULL WHEN 'Career Pro' THEN NULL ELSE "max_monthly_applications" END,
  "can_feature_jobs" = CASE "plan" WHEN 'Hiring Plus' THEN true ELSE "can_feature_jobs" END;