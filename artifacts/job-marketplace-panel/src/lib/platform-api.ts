import { io, type Socket } from "socket.io-client";

const apiBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed with status ${response.status}`);
  return body;
}

export async function apiRequestBlob(path: string): Promise<Blob> {
  const response = await fetch(`${apiBase}${path}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }
  return response.blob();
}

export function openPlatformSocket(onEvent: (event: unknown) => void): () => void {
  const base = new URL(apiBase, window.location.origin);
  const socket: Socket = io(base.origin, { path: "/socket.io", withCredentials: true, reconnection: true });
  socket.on("message.created", onEvent);
  return () => { socket.off("message.created", onEvent); socket.close(); };
}

export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
