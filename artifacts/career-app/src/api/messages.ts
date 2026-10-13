import { apiRequest } from "./client";

export type Message = {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  bodyHash: string;
  integrityValid: boolean;
  from: {
    id: string;
    name: string;
    email: string;
    role: string;
    encryptionPublicKey: string | null;
  };
  to: {
    id: string;
    name: string;
    email: string;
    role: string;
    encryptionPublicKey: string | null;
  };
};

export type MessageEvent = {
  type: "message.created";
  message: Message;
};

export type Conversation = {
  userId: string;
  name: string;
  email: string;
  role: string;
  encryptionPublicKey: string | null;
  lastMessage: Message;
  unreadCount: number;
};

export async function getMessages(): Promise<{ messages: Message[] }> {
  return apiRequest<{ messages: Message[] }>("/messages");
}

export async function sendMessage(
  toUserId: string,
  body: string,
): Promise<MessageEvent> {
  return apiRequest<MessageEvent>("/messages", {
    method: "POST",
    body: JSON.stringify({ toUserId, body }),
  });
}

export async function markMessageRead(
  messageId: string,
): Promise<{ message: Message }> {
  return apiRequest<{ message: Message }>(`/messages/${messageId}/read`, {
    method: "POST",
  });
}

export async function getRecipientKey(
  toUserId: string,
): Promise<{ userId: string; publicKey: string }> {
  return apiRequest<{ userId: string; publicKey: string }>(
    `/messages/recipient-key?toUserId=${toUserId}`,
  );
}

export async function setIdentityKey(publicKey: string): Promise<void> {
  await apiRequest<void>("/messages/identity-key", {
    method: "PUT",
    body: JSON.stringify({ publicKey }),
  });
}
