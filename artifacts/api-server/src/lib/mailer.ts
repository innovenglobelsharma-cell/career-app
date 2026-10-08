import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | undefined;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export type EmailDelivery = {
  to: { name: string; address: string };
  replyTo: { name: string; address: string };
  subject: string;
  text: string;
  html: string;
  idempotencyKey?: string;
};

type DeliveryResult = { messageId: string; transport: "resend" | "smtp" };

function booleanSetting(name: string, fallback: boolean): boolean {
  const value = optional(name)?.toLowerCase();
  if (value === undefined) return fallback;
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  throw new Error(`${name} must be true or false`);
}

export function getMailer(): Transporter {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!Number.isInteger(port) || port <= 0) throw new Error("SMTP_PORT must be a valid port number");

  const host = required("SMTP_HOST");
  const secure = booleanSetting("SMTP_SECURE", port === 465);
  if (secure && port !== 465) throw new Error("SMTP_SECURE=true requires SMTP_PORT=465");
  if (!secure && port === 465) throw new Error("SMTP_PORT=465 requires SMTP_SECURE=true");

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: required("SMTP_USER"),
      pass: required("SMTP_PASS"),
    },
    requireTLS: booleanSetting("SMTP_REQUIRE_TLS", !secure) && !secure,
    tls: { servername: host },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  return transporter;
}

export function getSender(): { name: string; address: string } {
  const configuredFrom = optional("EMAIL_FROM_EMAIL") || optional("RESEND_FROM_EMAIL") || optional("SMTP_FROM_EMAIL");
  const address = configuredFrom && !/(example\.com|yourdomain\.com)$/i.test(configuredFrom)
    ? configuredFrom
    : optional("SMTP_USER");
  if (!address) throw new Error("EMAIL_FROM_EMAIL is not configured with a verified sender address");
  return {
    name: optional("EMAIL_FROM_NAME") || optional("SMTP_FROM_NAME") || "Careerly Interviews",
    address,
  };
}

export async function sendEmail(message: EmailDelivery): Promise<DeliveryResult> {
  const resendApiKey = optional("RESEND_API_KEY");
  const sender = getSender();

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: `${sender.name} <${sender.address}>`,
        to: [`${message.to.name} <${message.to.address}>`],
        reply_to: `${message.replyTo.name} <${message.replyTo.address}>`,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
    if (!response.ok || !result.id) {
      const error = new Error(result.message || `Email API request failed with status ${response.status}`) as Error & { code: string; responseCode: number };
      error.code = "EMAIL_API_ERROR";
      error.responseCode = response.status;
      throw error;
    }
    return { messageId: result.id, transport: "resend" };
  }

  const info = await getMailer().sendMail({
    from: sender,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  return { messageId: info.messageId, transport: "smtp" };
}
