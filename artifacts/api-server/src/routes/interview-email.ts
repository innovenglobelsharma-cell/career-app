import { Router, type IRouter } from "express";
import { sendEmail } from "../lib/mailer";
import { logger } from "../lib/logger";
import { requireAuth, requireVerifiedRecruiter } from "../lib/auth";

const router: IRouter = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InvitationBody = {
  candidateName?: unknown;
  candidateEmail?: unknown;
  recruiterName?: unknown;
  recruiterEmail?: unknown;
  companyName?: unknown;
  interviewType?: unknown;
  date?: unknown;
  time?: unknown;
  duration?: unknown;
  meetingLink?: unknown;
  timezone?: unknown;
};

const clean = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

router.post("/email/interview-invitation", requireAuth, requireVerifiedRecruiter, async (req, res) => {
  const body = req.body as InvitationBody;
  const candidateName = clean(body.candidateName, 120);
  const candidateEmail = clean(body.candidateEmail, 254).toLowerCase();
  const recruiterName = clean(body.recruiterName, 120);
  const recruiterEmail = clean(body.recruiterEmail, 254).toLowerCase();
  const companyName = clean(body.companyName, 160);
  const interviewType = clean(body.interviewType, 120);
  const date = clean(body.date, 10);
  const time = clean(body.time, 5);
  const duration = Number(body.duration);
  const meetingLink = clean(body.meetingLink, 500);
  const timezone = clean(body.timezone, 80) || "Asia/Kolkata";

  let meetingUrl: URL;
  try { meetingUrl = new URL(meetingLink); } catch { res.status(400).json({ error: "A valid meeting link is required" }); return; }

  const validationFailed = req.authUser!.role !== "recruiter" || !candidateName || !emailPattern.test(candidateEmail) || !recruiterName || !emailPattern.test(recruiterEmail) || recruiterEmail !== req.authUser!.email || !companyName || !interviewType || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(duration) || duration < 15 || duration > 480 || meetingUrl.protocol !== "https:";
  if (validationFailed) { res.status(400).json({ error: "Complete all interview fields with valid values" }); return; }

  const scheduledAt = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(scheduledAt.getTime())) { res.status(400).json({ error: "The interview date or time is invalid" }); return; }

  const displayDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(scheduledAt);
  const safe = { candidateName: escapeHtml(candidateName), recruiterName: escapeHtml(recruiterName), companyName: escapeHtml(companyName), interviewType: escapeHtml(interviewType), displayDate: escapeHtml(displayDate), time: escapeHtml(time), timezone: escapeHtml(timezone), meetingLink: escapeHtml(meetingUrl.toString()) };
  const subject = `${companyName}: ${interviewType} interview invitation`;
  const text = `Hi ${candidateName},\n\n${companyName} has scheduled your ${interviewType} interview.\n\nDate: ${displayDate}\nTime: ${time} (${timezone})\nDuration: ${duration} minutes\nMeeting link: ${meetingUrl.toString()}\n\nPlease join a few minutes early. If you need to reschedule, reply to this email.\n\nRegards,\n${recruiterName}\n${companyName}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fc;font-family:Arial,sans-serif;color:#172554"><div style="max-width:620px;margin:32px auto;background:white;border:1px solid #dbe4f2;border-radius:16px;overflow:hidden"><div style="padding:24px;background:#0b1f44;color:white"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd">Interview invitation</div><h1 style="margin:10px 0 0;font-size:24px">${safe.interviewType}</h1></div><div style="padding:28px"><p>Hi <strong>${safe.candidateName}</strong>,</p><p>${safe.companyName} has scheduled your interview with ${safe.recruiterName}.</p><table style="width:100%;margin:24px 0;border-collapse:collapse"><tr><td style="padding:10px;border-bottom:1px solid #edf2f8;color:#64748b">Interview type</td><td style="padding:10px;border-bottom:1px solid #edf2f8;font-weight:bold">${safe.interviewType}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #edf2f8;color:#64748b">Date</td><td style="padding:10px;border-bottom:1px solid #edf2f8;font-weight:bold">${safe.displayDate}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #edf2f8;color:#64748b">Time</td><td style="padding:10px;border-bottom:1px solid #edf2f8;font-weight:bold">${safe.time} (${safe.timezone})</td></tr><tr><td style="padding:10px;color:#64748b">Duration</td><td style="padding:10px;font-weight:bold">${duration} minutes</td></tr></table><a href="${safe.meetingLink}" style="display:inline-block;padding:13px 22px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-weight:bold">Join interview meeting</a><p style="margin-top:24px;color:#64748b;font-size:13px">Please join a few minutes early. Reply to this email if you need to reschedule.</p></div></div></body></html>`;

  try {
    const info = await sendEmail({
      to: { name: candidateName, address: candidateEmail },
      replyTo: { name: recruiterName, address: recruiterEmail },
      subject,
      text,
      html,
      idempotencyKey: `interview/${candidateEmail}/${date}/${time}/${duration}`.replace(/[^a-zA-Z0-9/_-]/g, "-").slice(0, 256),
    });
    logger.info({ messageId: info.messageId, transport: info.transport, candidateEmail, interviewType }, "Interview invitation email sent");
    res.status(200).json({ sent: true, messageId: info.messageId, transport: info.transport });
  } catch (error) {
    logger.error({ err: error, candidateEmail, interviewType }, "Unable to send interview invitation email");
    const smtpError = error as { code?: string; responseCode?: number };
    const errorByCode: Record<string, string> = {
      EAUTH: "SMTP authentication failed. Check the mailbox address and app password.",
      ECONNECTION: "Could not connect to the SMTP server. Check the host, port, and TLS settings.",
      ETIMEDOUT: "The SMTP server timed out. Check network access and the SMTP port.",
      ESOCKET: "The secure SMTP connection failed. Check SMTP_SECURE and SMTP_PORT.",
      EMAIL_API_ERROR: "The email API rejected the invitation. Check RESEND_API_KEY, the verified sender domain, and provider logs.",
    };
    const message = errorByCode[smtpError.code || ""]
      || (smtpError.responseCode === 550
        ? "The SMTP provider rejected the sender or recipient address. Use a verified SMTP_FROM_EMAIL."
        : "The SMTP server could not send the invitation.");
    res.status(502).json({ error: message, code: smtpError.code || "SMTP_DELIVERY_FAILED" });
  }
});

export default router;
