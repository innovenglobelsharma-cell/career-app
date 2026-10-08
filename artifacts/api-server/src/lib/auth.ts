import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { companies, db, sessions, users } from "@workspace/db";

const SESSION_COOKIE = "careerly_session";
const SESSION_DAYS = 14;

export type AuthUser = typeof users.$inferSelect;

declare global {
  namespace Express {
    interface Request { authUser?: AuthUser; sessionId?: string }
  }
}

const scrypt = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) => {
  nodeScrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key as Buffer));
});

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = stored.split(":");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, res: Response): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  const secure = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER) || process.env.APP_URL?.trim().startsWith("https://") === true;
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function resolveSession(req: Request): Promise<{ user: AuthUser; sessionId: string } | null> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return null;
  const rows = await db.select({ user: users, sessionId: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await resolveSession(req);
    if (!session) { res.status(401).json({ error: "Authentication required" }); return; }
    req.authUser = session.user;
    req.sessionId = session.sessionId;
    next();
  } catch (error) { next(error); }
}

export async function requireVerifiedRecruiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.authUser?.role !== "recruiter") {
      res.status(403).json({ error: "Recruiter access required" });
      return;
    }
    const [company] = await db.select({ verificationStatus: companies.verificationStatus })
      .from(companies).where(eq(companies.recruiterId, req.authUser.id)).limit(1);
    if (company?.verificationStatus !== "verified") {
      res.status(403).json({ error: "Complete business verification and wait for admin approval before using recruiter tools" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export const publicUser = (user: AuthUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  city: user.city,
  createdAt: user.createdAt,
});
