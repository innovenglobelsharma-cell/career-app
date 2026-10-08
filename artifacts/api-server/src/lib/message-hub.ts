import type { Server } from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { eq, gt, and } from "drizzle-orm";
import { db, sessions } from "@workspace/db";
import { hashToken } from "./auth";
import { logger } from "./logger";

let io: SocketIOServer | undefined;
const readCookie = (header: string, name: string) => header
  .split(";")
  .map((part) => part.trim().split("="))
  .find(([key]) => key === name)?.slice(1).join("=");

export function publishToUsers(userIds: string[], event: unknown): void {
  for (const userId of new Set(userIds)) io?.to(`user:${userId}`).emit("message.created", event);
}

export function setupMessageWebSocket(server: Server): void {
  const allowedOrigins = (process.env.APP_URL || "http://localhost:5173").split(",").map((origin) => origin.trim().replace(/\/$/, ""));
  io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: { origin: allowedOrigins, credentials: true },
  });
  io.use(async (socket, next) => {
    try {
      const requestOrigin = socket.handshake.headers.origin?.replace(/\/$/, "");
      if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) return next(new Error("Origin not allowed"));
      const token = readCookie(socket.handshake.headers.cookie || "", "careerly_session");
      if (!token) return next(new Error("Authentication required"));
      const rows = await db.select({ userId: sessions.userId }).from(sessions)
        .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
        .limit(1);
      const userId = rows[0]?.userId;
      if (!userId) return next(new Error("Authentication required"));
      socket.data.userId = userId;
      next();
    } catch (error) {
      logger.error({ err: error }, "WebSocket authentication failed");
      next(new Error("Authentication failed"));
    }
  });
  io.on("connection", (socket: Socket) => {
    socket.join(`user:${socket.data.userId as string}`);
    socket.emit("connected", { type: "connected" });
  });
}
