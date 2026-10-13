import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionApplication, canTransitionJob, resolveEntitlements, resolvePlanEntitlements } from "./business-rules.ts";

test("Free entitlements are the default unless a recognized paid plan is verified", () => {
  assert.deepEqual(resolveEntitlements("recruiter"), {
    plan: "Free",
    maxActiveJobs: 1,
    canFeatureJobs: false,
    monthlyApplications: null,
  });
  assert.equal(resolveEntitlements("recruiter", "Hiring Plus").canFeatureJobs, true);
  assert.equal(resolveEntitlements("job_seeker", "Hiring Plus").plan, "Free");
  assert.equal(resolveEntitlements("job_seeker", "Career Plus").monthlyApplications, null);
});

test("verified subscriptions apply limits and features from the configured plan", () => {
  assert.deepEqual(resolvePlanEntitlements("recruiter", "Hiring Team", {
    audience: "recruiter",
    maxActiveJobs: 4,
    maxMonthlyApplications: null,
    canFeatureJobs: true,
  }), {
    plan: "Hiring Team",
    maxActiveJobs: 4,
    canFeatureJobs: true,
    monthlyApplications: null,
  });
  assert.equal(resolvePlanEntitlements("job_seeker", "Career Starter", {
    audience: "job_seeker",
    maxActiveJobs: null,
    maxMonthlyApplications: 12,
    canFeatureJobs: false,
  }).monthlyApplications, 12);
  assert.equal(resolvePlanEntitlements("job_seeker", "Hiring Team", {
    audience: "recruiter",
    maxActiveJobs: 4,
    maxMonthlyApplications: null,
    canFeatureJobs: true,
  }).plan, "Free");
});

test("only administrators can activate jobs and statuses follow the approval lifecycle", () => {
  assert.equal(canTransitionJob("pending", "active", "recruiter"), false);
  assert.equal(canTransitionJob("pending", "active", "admin"), true);
  assert.equal(canTransitionJob("active", "closed", "recruiter"), true);
  assert.equal(canTransitionJob("closed", "active", "admin"), false);
});

test("application status changes follow the audited lifecycle", () => {
  assert.equal(canTransitionApplication("applied", "viewed", "recruiter"), true);
  assert.equal(canTransitionApplication("applied", "selected", "recruiter"), false);
  assert.equal(canTransitionApplication("interview", "selected", "recruiter"), true);
  assert.equal(canTransitionApplication("rejected", "interview", "admin"), false);
  assert.equal(canTransitionApplication("applied", "withdrawn", "job_seeker"), true);
  assert.equal(canTransitionApplication("selected", "withdrawn", "job_seeker"), false);
});