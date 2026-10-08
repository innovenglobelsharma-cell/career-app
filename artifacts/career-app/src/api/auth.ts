import { apiRequest } from "@/api/client";
import type {
  AuthUser,
  LoginResponse,
  SendLoginOtpInput,
  SendLoginOtpResponse,
  VerifyLoginOtpInput,
} from "@/types/auth";

export async function sendLoginOtpRequest(input: SendLoginOtpInput) {
  return apiRequest<SendLoginOtpResponse>("/auth/login/otp/send", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });
}

export async function resendLoginOtpRequest(input: SendLoginOtpInput) {
  return apiRequest<SendLoginOtpResponse>("/auth/login/otp/resend", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });
}

export async function verifyLoginOtpRequest(input: VerifyLoginOtpInput) {
  return apiRequest<LoginResponse>("/auth/login/otp/verify", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });
}

export async function getMeRequest() {
  return apiRequest<{ user: AuthUser }>("/auth/me");
}

export async function logoutRequest() {
  return apiRequest<unknown>("/auth/logout", {
    method: "POST",
  });
}
