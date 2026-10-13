import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { companies, db, messages, users } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { publishToUsers } from "../lib/message-hub";

const router: IRouter = Router();
const messageSecret = () => process.env.MESSAGE_HASH_SECRET?.trim() || process.env.SESSION_SECRET?.trim() || (() => { throw new Error("MESSAGE_HASH_SECRET or SESSION_SECRET must be configured"); })();
const messageEncryptionKey = () => {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY?.trim() || process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("MESSAGE_ENCRYPTION_KEY or a 32-character SESSION_SECRET must be configured");
  return createHash("sha256").update("careerly-message-encryption-v1\0").update(secret).digest();
};
const encryptStoredMessage = (plaintext: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", messageEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `server:v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
};
const decryptStoredMessage = (stored: string) => {
  const match = /^server:v1:([A-Za-z0-9_-]{16}):([A-Za-z0-9_-]{22}):([A-Za-z0-9_-]+)$/.exec(stored);
  if (!match) throw new Error("Stored message ciphertext has an invalid format");
  const decipher = createDecipheriv("aes-256-gcm", messageEncryptionKey(), Buffer.from(match[1], "base64url"));
  decipher.setAuthTag(Buffer.from(match[2], "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(match[3], "base64url")),
    decipher.final(),
  ]).toString("utf8");
};
const messageHash = (message: { id: string; fromUserId: string; toUserId: string; body: string; createdAt: Date; fromPublicKey?: string | null; toPublicKey?: string | null }) => {
  const payload = `${message.id}\n${message.fromUserId}\n${message.toUserId}\n${message.createdAt.toISOString()}\n${message.body}`;
  const keySnapshots = message.fromPublicKey || message.toPublicKey
    ? `\n${message.fromPublicKey || ""}\n${message.toPublicKey || ""}`
    : "";
  return createHmac("sha256", messageSecret()).update(payload + keySnapshots).digest("hex");
};
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
    res.json({ messages: rows.map((message) => {
      const { serverBody, serverBodyHash, ...visibleMessage } = message;
      const bodyIntegrityValid = message.bodyHash === messageHash(message);
      const serverBodyIntegrityValid = !serverBody
        || serverBodyHash === messageHash({ ...message, body: serverBody });
      const integrityValid = bodyIntegrityValid && serverBodyIntegrityValid;
      const storedBody = serverBody || message.body;
      const body = integrityValid
        ? storedBody.startsWith("server:v1:") ? decryptStoredMessage(storedBody) : storedBody
        : "This message could not be verified.";
      return {
        ...visibleMessage,
        body,
        from: userById.get(message.fromUserId),
        to: userById.get(message.toUserId),
        integrityValid,
        legacyEncrypted: !serverBody
          && !message.body.startsWith("server:v1:")
          && /^e2ee:v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(message.body),
      };
    }) });
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
    const [user] = await db.select({ publicKey: users.encryptionPublicKey })
      .from(users).where(eq(users.id, req.authUser!.id)).limit(1);
    if (user?.publicKey && user.publicKey !== publicKey) {
      res.status(409).json({ error: "This account already has a secure-message identity. Restore its saved key before changing devices so existing messages remain readable." }); return;
    }
    if (!user?.publicKey) {
      await db.update(users).set({ encryptionPublicKey: publicKey }).where(eq(users.id, req.authUser!.id));
    }
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/messages/key-backup", requireAuth, async (req, res, next) => {
  try {
    const [user] = await db.select({ backup: users.encryptionKeyBackup, publicKey: users.encryptionPublicKey })
      .from(users).where(eq(users.id, req.authUser!.id)).limit(1);
    res.json({ backup: user?.backup || null, publicKey: user?.publicKey || null });
  } catch (error) { next(error); }
});

router.put("/messages/key-backup", requireAuth, async (req, res, next) => {
  try {
    const backup = req.body?.backup;
    if (typeof backup !== "string" || backup.length > 16_384) {
      res.status(400).json({ error: "Invalid encrypted message-key backup" }); return;
    }
    let parsed: unknown;
    try { parsed = JSON.parse(backup); } catch { res.status(400).json({ error: "Invalid encrypted message-key backup" }); return; }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      res.status(400).json({ error: "Invalid encrypted message-key backup" }); return;
    }
    const value = parsed as Record<string, unknown>;
    if (value.version !== 1
      || typeof value.salt !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(value.salt)
      || typeof value.iv !== "string" || !/^[A-Za-z0-9_-]{16}$/.test(value.iv)
      || typeof value.ciphertext !== "string" || !/^[A-Za-z0-9_-]{100,12000}$/.test(value.ciphertext)) {
      res.status(400).json({ error: "Invalid encrypted message-key backup" }); return;
    }
    await db.update(users).set({ encryptionKeyBackup: backup }).where(eq(users.id, req.authUser!.id));
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
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body || body.length > 20_000) { res.status(400).json({ error: "A message between 1 and 20,000 characters is required" }); return; }
    let [recipient] = toUserId
      ? await db.select({ id: users.id, role: users.role, name: users.name, email: users.email, encryptionPublicKey: users.encryptionPublicKey }).from(users).where(eq(users.id, toUserId)).limit(1)
      : await db.select({ id: users.id, role: users.role, name: users.name, email: users.email, encryptionPublicKey: users.encryptionPublicKey }).from(users).where(eq(users.email, toEmail)).limit(1);
    if (!recipient && !toUserId && toEmail) {
      [recipient] = await db.select({
        id: users.id,
        role: users.role,
        name: users.name,
        email: users.email,
        encryptionPublicKey: users.encryptionPublicKey,
      }).from(companies)
        .innerJoin(users, eq(companies.recruiterId, users.id))
        .where(sql`lower(${companies.contactEmail}) = ${toEmail}`)
        .limit(1);
    }
    if (!recipient) { res.status(404).json({ error: "Recipient not found" }); return; }
    if (recipient.role === "recruiter" && !(await recruiterIsVerified(recipient.id))) {
      res.status(403).json({ error: "The company must be verified before messaging" }); return;
    }
    toUserId = recipient.id;
    if (!body || toUserId === req.authUser!.id) { res.status(400).json({ error: "A message and recipient are required" }); return; }
    const validRolePair = new Set([req.authUser!.role, recipient.role]).size === 2 && [req.authUser!.role, recipient.role].every((role) => role === "job_seeker" || role === "recruiter");
    if (!validRolePair) { res.status(403).json({ error: "Messages are limited to recruiter and job-seeker conversations" }); return; }
    const createdAt = new Date();
    const legacyEnvelope = /^e2ee:v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(body);
    if (legacyEnvelope && (!req.authUser!.encryptionPublicKey || !recipient.encryptionPublicKey)) {
      res.status(409).json({ error: "This older app cannot send from a device without its original secure-message key. Reload the app to use cross-device messaging." }); return;
    }
    const storedBody = legacyEnvelope ? body : encryptStoredMessage(body);
    const record = {
      id: randomUUID(),
      conversationId: conversationIdFor(req.authUser!.id, toUserId),
      fromUserId: req.authUser!.id,
      toUserId,
      body: storedBody,
      fromPublicKey: legacyEnvelope ? req.authUser!.encryptionPublicKey : null,
      toPublicKey: legacyEnvelope ? recipient.encryptionPublicKey : null,
      createdAt,
    };
    const [created] = await db.insert(messages).values({ ...record, bodyHash: messageHash(record) }).returning();
    const event = { type: "message.created", clientMessageId: req.body?.clientMessageId, message: {
      ...created,
      body,
      integrityValid: true,
      from: { id: req.authUser!.id, name: req.authUser!.name, email: req.authUser!.email, role: req.authUser!.role, encryptionPublicKey: req.authUser!.encryptionPublicKey },
      to: { id: recipient.id, name: recipient.name, email: recipient.email, role: recipient.role, encryptionPublicKey: recipient.encryptionPublicKey },
    } };
    publishToUsers([record.fromUserId, record.toUserId], event);
    res.status(201).json(event);
  } catch (error) { next(error); }
});

router.post("/messages/:id/migrate-legacy", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === "recruiter" && !(await recruiterIsVerified(req.authUser!.id))) {
      res.status(403).json({ error: "Company verification is required before using recruiter tools" }); return;
    }
    const plaintext = typeof req.body?.body === "string" ? req.body.body : "";
    if (!plaintext.trim() || plaintext.length > 20_000) {
      res.status(400).json({ error: "A valid message body is required" }); return;
    }
    const [record] = await db.select().from(messages).where(eq(messages.id, String(req.params.id))).limit(1);
    if (!record || (record.fromUserId !== req.authUser!.id && record.toUserId !== req.authUser!.id)) {
      res.status(404).json({ error: "Message not found" }); return;
    }
    if (record.serverBody) { res.status(204).end(); return; }
    if (!/^e2ee:v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(record.body)) {
      res.status(409).json({ error: "This message is not an eligible legacy message" }); return;
    }
    const serverBody = encryptStoredMessage(plaintext);
    await db.update(messages)
      .set({ serverBody, serverBodyHash: messageHash({ ...record, body: serverBody }) })
      .where(and(eq(messages.id, record.id), isNull(messages.serverBody)));
    publishToUsers([record.fromUserId, record.toUserId], { type: "message.updated", messageId: record.id });
    res.status(204).end();
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
