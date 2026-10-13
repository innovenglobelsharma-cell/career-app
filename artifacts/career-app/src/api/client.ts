import { API_BASE_URL } from "@/config/env";
import { ApiError } from "./errors";

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

function buildUrl(path: string) {
  if (!API_BASE_URL) {
    throw new ApiError(
      "Missing EXPO_PUBLIC_API_URL. Add it to .env before calling the API.",
      0,
      "MISSING_API_URL",
    );
  }

  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith("/api/")
    ? normalizedPath
    : `/api${normalizedPath}`;

  return `${origin}${apiPath}`;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * The Careerly API authenticates with an httpOnly session cookie
 * (`careerly_session`). Native fetch persists cookies in the platform
 * cookie store, and `credentials: "include"` keeps cross-origin web
 * requests authenticated.
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "Network request failed. Check the API URL and device network access.",
      0,
      "NETWORK_ERROR",
    );
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String(data.error)
        : typeof data === "object" && data && "message" in data
          ? String(data.message)
          : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status);
  }

  return data as T;
}
