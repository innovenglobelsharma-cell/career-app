import { and, eq } from "drizzle-orm";
import { randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { db, pool } from "./index";
import { applications, companies, jobs, supportTickets, users } from "./schema";

const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => nodeScrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key as Buffer)));
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
};

const ids = {
  seeker: "11111111-1111-4111-8111-111111111111",
  recruiter: "22222222-2222-4222-8222-222222222222",
  support: "33333333-3333-4333-8333-333333333333",
  admin: "44444444-4444-4444-8444-444444444444",
  company: "55555555-5555-4555-8555-555555555555",
  figma: "66666666-6666-4666-8666-666666666666",
  linear: "77777777-7777-4777-8777-777777777777",
};

async function seed() {
  const demoPasswordHash = await hashPassword("Demo@123");
  await db.insert(users).values([
    { id: ids.seeker, name: "Arjun Mehta", email: "arjun.mehta@careerly.demo", passwordHash: demoPasswordHash, role: "job_seeker", city: "Bengaluru" },
    { id: ids.recruiter, name: "Maya Chen", email: "maya.chen@careerly.demo", passwordHash: demoPasswordHash, role: "recruiter", city: "Bengaluru" },
    { id: ids.support, name: "Aisha Khan", email: "support@careerly.demo", passwordHash: demoPasswordHash, role: "support", city: "Mumbai" },
    { id: ids.admin, name: "Jordan Lee", email: "admin@careerly.demo", passwordHash: demoPasswordHash, role: "admin", city: "Bengaluru" },
  ]).onConflictDoUpdate({ target: users.id, set: { passwordHash: demoPasswordHash } });
  await db.insert(companies).values({ id: ids.company, name: "Figma", industry: "Design software", city: "Bengaluru", website: "https://figma.com", description: "Collaborative tools for product teams.", recruiterId: ids.recruiter }).onConflictDoNothing({ target: companies.id });
  await db.insert(jobs).values([
    { id: ids.figma, companyId: ids.company, title: "Senior Product Designer", location: "Bengaluru", workMode: "Hybrid", employmentType: "Full-time", experience: "5–8 years", salaryMin: 1800000, salaryMax: 2800000, description: "Shape collaborative tools used by product teams.", skills: ["Figma", "Product strategy", "Design systems"], status: "active" },
    { id: ids.linear, companyId: ids.company, title: "Product Designer, Growth", location: "Remote", workMode: "Remote", employmentType: "Full-time", experience: "3–5 years", salaryMin: 1500000, salaryMax: 2200000, description: "Design experiments that help teams discover better ways to work.", skills: ["Growth", "Research", "Prototyping"], status: "active" },
  ]).onConflictDoNothing({ target: jobs.id });
  await db.insert(applications).values([
    { jobId: ids.figma, seekerId: ids.seeker, status: "interview", coverNote: "I would love to bring my systems experience to Figma." },
    { jobId: ids.linear, seekerId: ids.seeker, status: "applied", coverNote: "My growth design work is a strong fit for this role." },
  ]).onConflictDoNothing({ target: [applications.jobId, applications.seekerId] });
  const [existingTicket] = await db.select({ id: supportTickets.id }).from(supportTickets).where(and(eq(supportTickets.openedById, ids.seeker), eq(supportTickets.subject, "Resume upload question"))).limit(1);
  if (!existingTicket) await db.insert(supportTickets).values({ openedById: ids.seeker, assignedToId: ids.support, subject: "Resume upload question", category: "Account issue", priority: "medium", status: "in_progress" });
  console.log("Demo data seeded. Login: arjun.mehta@careerly.demo / Demo@123");
}

seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => { await pool.end(); });
