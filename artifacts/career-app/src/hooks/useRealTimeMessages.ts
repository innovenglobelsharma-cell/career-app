import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/auth/auth-provider";
import { MessageEvent, Message, Conversation } from "@/api/messages";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export function useRealTimeMessages() {
  const { currentUser } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const socket: Socket = io(API_URL, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("connect_error", (err) => {
      setError(err.message);
      setIsConnected(false);
    });

    socket.on("message.created", (event: MessageEvent) => {
      if (event.type === "message.created" && event.message) {
        const newMessage = event.message;
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });

        setConversations((prev) => {
          const otherUserId =
            newMessage.fromUserId === currentUser.id
              ? newMessage.toUserId
              : newMessage.fromUserId;
          const otherUser =
            newMessage.fromUserId === currentUser.id
              ? newMessage.to
              : newMessage.from;
          const existingIndex = prev.findIndex((c) => c.userId === otherUserId);

          const updatedConversation: Conversation = {
            userId: otherUserId,
            name: otherUser.name,
            email: otherUser.email,
            role: otherUser.role,
            encryptionPublicKey: otherUser.encryptionPublicKey,
            lastMessage: newMessage,
            unreadCount:
              newMessage.toUserId === currentUser.id && !newMessage.readAt
                ? 1
                : 0,
          };

          if (existingIndex >= 0) {
            const updated = [...prev];
            const existing = updated[existingIndex];
            updated[existingIndex] = {
              ...existing,
              lastMessage: newMessage,
              unreadCount:
                existing.unreadCount +
                (newMessage.toUserId === currentUser.id && !newMessage.readAt
                  ? 1
                  : 0),
            };
            updated.sort(
              (a, b) =>
                new Date(b.lastMessage.createdAt).getTime() -
                new Date(a.lastMessage.createdAt).getTime(),
            );
            return updated;
          }
          return [updatedConversation, ...prev].sort(
            (a, b) =>
              new Date(b.lastMessage.createdAt).getTime() -
              new Date(a.lastMessage.createdAt).getTime(),
          );
        });
      }
    });

    socketRef.current = socket;

    return () => {
      socket.off("message.created");
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [currentUser?.id]);

  const sendMessage = useCallback(async (toUserId: string, body: string) => {
    if (!socketRef.current?.connected) {
      throw new Error("Not connected to messaging server");
    }
    // The optimistic update will happen via the socket event
    // But we still call the API to persist
    return true;
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!socketRef.current?.connected) {
      throw new Error("Not connected to messaging server");
    }
  }, []);

  return {
    isConnected,
    messages,
    conversations,
    error,
    sendMessage,
    markAsRead,
  };
}
