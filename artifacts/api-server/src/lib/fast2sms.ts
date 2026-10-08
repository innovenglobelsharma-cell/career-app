import { logger } from "./logger";

type Fast2SmsResponse = {
  return?: boolean | string;
  message?: string | string[];
};

export class SmsProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "SmsProviderError";
  }
}

function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new SmsProviderError(`Phone verification is not configured: ${name} is missing.`, 503);
  return value;
}

function credentials() {
  // DLT entity IDs are registered in Fast2SMS DLT Manager; bulkV2 accepts the message ID, sender, route and variables.
  return {
    apiKey: requiredSetting("FAST2SMS_API_KEY"),
    senderId: requiredSetting("FAST2SMS_SENDER_ID"),
    route: requiredSetting("FAST2SMS_ROUTE"),
    templateId: requiredSetting("FAST2SMS_TEMPLATE_ID"),
  };
}

function responseMessage(result: Fast2SmsResponse): string | undefined {
  if (Array.isArray(result.message)) return result.message.join("; ").slice(0, 400);
  return result.message?.slice(0, 400);
}

export async function sendPhoneOtp(mobile: string, otp: string): Promise<void> {
  const { apiKey, senderId, route, templateId } = credentials();
  if (!/^\d+$/.test(templateId)) {
    throw new SmsProviderError("FAST2SMS_TEMPLATE_ID must be the numeric DLT Message ID.", 503);
  }

  let response: Response;
  try {
    response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_id: senderId,
        message: Number(templateId),
        variables_values: otp,
        route,
        numbers: mobile,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Fast2SMS DLT request could not be reached");
    throw new SmsProviderError("Unable to reach Fast2SMS. Check API server network access and try again.");
  }

  const result = await response.json().catch(() => ({})) as Fast2SmsResponse;
  const message = responseMessage(result);
  if (!response.ok || (result.return !== true && result.return !== "true")) {
    logger.warn({ providerStatus: response.status, providerMessage: message }, "Fast2SMS rejected the DLT SMS request");
    throw new SmsProviderError(message || `Fast2SMS rejected the SMS request (HTTP ${response.status}).`);
  }
}
