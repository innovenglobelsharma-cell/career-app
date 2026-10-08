import { createHmac, randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { asc, eq, inArray, or } from "drizzle-orm";
import { companies, db, messages, users } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { publishToUsers } from "../lib/message-hub";

const router: IRouter = Router();
const messageSecret = () => process.env.MESSAGE_HASH_SECRET?.trim() || process.env.SESSION_SECRET?.trim() || (() => { throw new Error("MESSAGE_HASH_SECRET or SESSION_SECRET must be configured"); })();
const messageHash = (message: { id: string; fromUserId: string; toUserId: string; body: string; createdAt: Date }) => createHmac("sha256", messageSecret()).update(`${message.id}\n${message.fromUserId}\n${message.toUserId}\n${message.createdAt.toISOString()}\n${message.body}`).digest("hex");
const conversationIdFor = (first: string, second: string) => [first, second].sort().join(":");
const recruiterIsVerified = async (userId: string) => {
  const [company] = await db.select({ verificationStatus: companies.verificationStatus })
    .from(companies).where(eq(companies.recruiterId, userId)).limit(1);
  return company?.verificationStatus === "verified";
};

router.get("/messages", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === "recruiter" && !(await recruiterIsVerified(req.authUser!.id))) {
      res.status(403).json({ error: "Company verification is required before using recruiter tools" }); return;
    }
    const rows = await db.select().from(messages).where(or(eq(messages.fromUserId, req.authUser!.id), eq(messages.toUserId, req.authUser!.id))).orderBy(asc(messages.createdAt));
    const userIds = Array.from(new Set(rows.flatMap((message) => [message.fromUserId, message.toUserId])));
    const participants = userIds.length ? await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, encryptionPublicKey: users.encryptionPublicKey }).from(users).where(inArray(users.id, userIds)) : [];
    const userById = new Map(participants.map((user) => [user.id, user]));
    res.json({ messages: rows.map((message) => ({
      ...message,
      from: userById.get(message.fromUserId),
      to: userById.get(message.toUserId),
      integrityValid: message.bodyHash === messageHash(message),
    })) });
  } catch (error) { next(error); }
});

router.put("/messages/identity-key", requireAuth, async (req, res, next) => {
  try {
    const publicKey = String(req.body?.publicKey || "");
    // A P-256 SPKI key is normally 124 base64 characters; retain a bounded,
    // format-safe value rather than accepting an arbitrary blob.
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(publicKey) || publicKey.length < 80 || publicKey.length > 512) {
      res.status(400).json({ error: "Invalid encryption public key" }); return;
    }
    // Browser-local keys can legitimately change after browser storage is
    // cleared or a user moves devices. Accepting the active authenticated
    // identity keeps current and newly registered users able to send messages
    // instead of trapping them behind a permanent 409 response.
    await db.update(users).set({ encryptionPublicKey: publicKey }).where(eq(users.id, req.authUser!.id));
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/messages/recipient-key", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === "recruiter" && !(await recruiterIsVerified(req.authUser!.id))) {
      res.status(403).json({ error: "Company verification is required before using recruiter tools" }); return;
    }
    const toUserId = String(req.query.toUserId || "");
    const toEmail = String(req.query.toEmail || "").trim().toLowerCase();
    const [recipient] = toUserId
      ? await db.select({ id: users.id, role: users.role, encryptionPublicKey: users.encryptionPublicKey }).from(users).where(eq(users.id, toUserId)).limit(1)
      : await db.select({ id: users.id, role: users.role, encryptionPublicKey: users.encryptionPublicKey }).from(users).where(eq(users.email, toEmail)).limit(1);
    if (!recipient) { res.status(404).json({ error: "Recipient not found" }); return; }
    if (recipient.role === "recruiter" && !(await recruiterIsVerified(recipient.id))) {
      res.status(403).json({ error: "The company must be verified before messaging" }); return;
    }
    if (!recipient.encryptionPublicKey) { res.status(409).json({ error: "Recipient has not enabled secure messaging yet" }); return; }
    res.json({ userId: recipient.id, publicKey: recipient.encryptionPublicKey });
  } catch (error) { next(error); }
});

router.post("/messages", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === "recruiter" && !(await recruiterIsVerified(req.authUser!.id))) {
      res.status(403).json({ error: "Company verification is required before using recruiter tools" }); return;
    }
    let toUserId = String(req.body?.toUserId || "");
    const toEmail = String(req.body?.toEmail || "").trim().toLowerCase();
    const body = String(req.body?.body || "").trim().slice(0, 20_000);
    const [recipient] = toUserId
      ? await db.select({ id: users.id, role: users.role, name: users.name, email: users.email, encryptionPublicKey: users.encryptionPublicKey }).from(users).where(eq(users.id, toUserId)).limit(1)
      : await db.select({ id: users.id, role: users.role, name: users.name, email: users.email, encryptionPublicKey: users.encryptionPublicKey }).from(users).where(eq(users.email, toEmail)).limit(1);
    if (!recipient) { res.status(404).json({ error: "Recipient not found" }); return; }
    if (recipient.role === "recruiter" && !(await recruiterIsVerified(recipient.id))) {
      res.status(403).json({ error: "The company must be verified before messaging" }); return;
    }
    toUserId = recipient.id;
    if (!/^e2ee:v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(body) || toUserId === req.authUser!.id) { res.status(400).json({ error: "An encrypted message and recipient are required" }); return; }
    const validRolePair = new Set([req.authUser!.role, recipient.role]).size === 2 && [req.authUser!.role, recipient.role].every((role) => role === "job_seeker" || role === "recruiter");
    if (!validRolePair) { res.status(403).json({ error: "Messages are limited to recruiter and job-seeker conversations" }); return; }
    const createdAt = new Date();
    const record = { id: randomUUID(), conversationId: conversationIdFor(req.authUser!.id, toUserId), fromUserId: req.authUser!.id, toUserId, body, createdAt };
    const [created] = await db.insert(messages).values({ ...record, bodyHash: messageHash(record) }).returning();
    // The encrypted body and public-key metadata allow both authenticated
    // peers to render this Socket.IO event immediately, without a history GET.
    const event = { type: "message.created", message: {
      ...created,
      integrityValid: true,
      from: { id: req.authUser!.id, name: req.authUser!.name, email: req.authUser!.email, role: req.authUser!.role, encryptionPublicKey: req.authUser!.encryptionPublicKey },
      to: { id: recipient.id, name: recipient.name, email: recipient.email, role: recipient.role, encryptionPublicKey: recipient.encryptionPublicKey },
    } };
    publishToUsers([record.fromUserId, record.toUserId], event);
    res.status(201).json(event);
  } catch (error) { next(error); }
});

router.post("/messages/:id/read", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === "recruiter" && !(await recruiterIsVerified(req.authUser!.id))) {
      res.status(403).json({ error: "Company verification is required before using recruiter tools" }); return;
    }
    const [record] = await db.select().from(messages).where(eq(messages.id, String(req.params.id))).limit(1);
    if (!record || record.toUserId !== req.authUser!.id) { res.status(404).json({ error: "Message not found" }); return; }
    const [updated] = await db.update(messages).set({ readAt: new Date() }).where(eq(messages.id, record.id)).returning();
    res.json({ message: updated });
  } catch (error) { next(error); }
});

export default router;
