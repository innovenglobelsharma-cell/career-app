const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");

export const API_BASE_URL = rawApiUrl;

export function hasApiBaseUrl() {
  return API_BASE_URL.length > 0;
}