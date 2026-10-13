import { apiRequest } from "@/api/client";
import type { AuthUser, LoginInput, LoginResponse } from "@/types/auth";

export async function loginRequest(input: LoginInput) {
  return apiRequest<LoginResponse>("/auth/login", {
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
