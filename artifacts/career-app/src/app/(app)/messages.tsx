import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/auth-provider";
import { APP_COLORS, AppIconName, MaxContentWidth } from "@/constants/theme";
import {
  getMessages,
  sendMessage,
  markMessageRead,
  getRecipientKey,
  setIdentityKey,
} from "@/api/messages";
import {
  generateKeyPair,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  loadLocalKeys,
  saveLocalKeys,
  loadPrivateKey,
} from "@/lib/encryption";
import { Message, Conversation } from "@/api/messages";
import { useRealTimeMessages } from "@/hooks/useRealTimeMessages";

const MESSAGE_ICON: AppIconName = {
  ios: "message",
  android: "chat",
  web: "chat",
};

type Params = { userId?: string; conversationId?: string };

export default function MessagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { currentUser } = useAuth();
  const {
    conversations,
    isConnected,
    error: socketError,
  } = useRealTimeMessages();

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [localKeys, setLocalKeys] = useState<{
    publicKey: string;
    privateKey: CryptoKey;
  } | null>(null);
  const [sharedKeys, setSharedKeys] = useState<Map<string, CryptoKey>>(
    new Map(),
  );
  const messagesEndRef = useRef<View>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    async function initKeys() {
      const stored = loadLocalKeys();
      if (stored) {
        const privateKey = await loadPrivateKey(stored.privateKeyB64);
        setLocalKeys({ publicKey: stored.publicKey, privateKey });
      } else {
        const { publicKey, privateKey } = await generateKeyPair();
        setLocalKeys({ publicKey, privateKey });
        saveLocalKeys(publicKey, privateKey);
        await setIdentityKey(publicKey);
      }
    }
    initKeys();
  }, []);

  useEffect(() => {
    async function loadInitialMessages() {
      try {
        const { messages: msgs } = await getMessages();
        setMessages(msgs);
        buildConversations(msgs);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialMessages();
  }, []);

  const buildConversations = (msgs: Message[]) => {
    const convMap = new Map<string, Conversation>();
    for (const msg of msgs) {
      const otherUserId =
        msg.fromUserId === currentUser?.id ? msg.toUserId : msg.fromUserId;
      const otherUser = msg.fromUserId === currentUser?.id ? msg.to : msg.from;
      if (!convMap.has(otherUserId)) {
        convMap.set(otherUserId, {
          userId: otherUserId,
          name: otherUser.name,
          email: otherUser.email,
          role: otherUser.role,
          encryptionPublicKey: otherUser.encryptionPublicKey,
          lastMessage: msg,
          unreadCount: msg.toUserId === currentUser?.id && !msg.readAt ? 1 : 0,
        });
      }
    }
    const convs = Array.from(convMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    );
  };

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const convMessages = messages.filter(
      (m) =>
        (m.fromUserId === conversation.userId &&
          m.toUserId === currentUser?.id) ||
        (m.toUserId === conversation.userId &&
          m.fromUserId === currentUser?.id),
    );
    setMessages(
      convMessages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    );

    if (conversation.encryptionPublicKey && localKeys) {
      const peerKey = await importPublicKey(conversation.encryptionPublicKey);
      const sharedKey = await deriveSharedKey(localKeys.privateKey, peerKey);
      setSharedKeys((prev) =>
        new Map(prev).set(conversation.userId, sharedKey),
      );
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !localKeys || sending)
      return;

    const sharedKey = sharedKeys.get(selectedConversation.userId);
    if (!sharedKey) {
      Alert.alert("Error", "Encryption not ready. Please wait a moment.");
      return;
    }

    const encrypted = await encryptMessage(sharedKey, newMessage.trim());
    setSending(true);
    setNewMessage("");

    try {
      await sendMessage(selectedConversation.userId, encrypted);
    } catch (err) {
      console.error("Failed to send message:", err);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.fromUserId === currentUser?.id;
    const sharedKey = sharedKeys.get(isOwn ? item.toUserId : item.fromUserId);
    const [decrypted, setDecrypted] = useState<string>("");

    useEffect(() => {
      if (sharedKey) {
        decryptMessage(sharedKey, item.body)
          .then(setDecrypted)
          .catch(() => setDecrypted("[Unable to decrypt]"));
      } else {
        setDecrypted("[Encrypted]");
      }
    }, [item.body, sharedKey]);

    return (
      <View style={[styles.messageContainer, isOwn && styles.messageOwn]}>
        <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {decrypted || "Decrypting..."}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (!selectedConversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <SymbolView
            name={{
              ios: MESSAGE_ICON.ios,
              android: MESSAGE_ICON.android,
              web: MESSAGE_ICON.web,
            }}
            size={32}
            tintColor={APP_COLORS.primary}
          />
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectConversation(item)}
              style={styles.conversationItem}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationName}>{item.name}</Text>
                  <Text style={styles.conversationTime}>
                    {new Date(item.lastMessage.createdAt).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </Text>
                </View>
                <Text style={styles.conversationPreview} numberOfLines={1}>
                  {item.lastMessage.body.startsWith("e2ee:v1:")
                    ? "[Encrypted message]"
                    : item.lastMessage.body}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <SymbolView
                name={{ ios: "message", android: "chat", web: "chat" }}
                size={48}
                tintColor={APP_COLORS.mutedText}
              />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation from a job or profile
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.chatContainer}>
      <View style={styles.chatHeader}>
        <Pressable
          onPress={() => setSelectedConversation(null)}
          style={styles.backButton}
        >
          <SymbolView
            name={{
              ios: "chevron.left",
              android: "chevron_left",
              web: "chevron_left",
            }}
            size={24}
            tintColor="#FFFFFF"
          />
        </Pressable>
        <View style={styles.chatHeaderInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {selectedConversation.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.chatHeaderName}>
              {selectedConversation.name}
            </Text>
            <Text style={styles.chatHeaderStatus}>
              {isConnected ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        inverted
      >
        <View ref={messagesEndRef} />
      </FlatList>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            maxLength={2000}
            onSubmitEditing={handleSendMessage}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <SymbolView
                name={{ ios: "paperplane.fill", android: "send", web: "send" }}
                size={22}
                tintColor="#FFFFFF"
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.canvas,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: APP_COLORS.text,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: APP_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: APP_COLORS.primary,
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "700",
    color: APP_COLORS.text,
  },
  conversationTime: {
    fontSize: 12,
    color: APP_COLORS.mutedText,
  },
  conversationPreview: {
    fontSize: 14,
    color: APP_COLORS.mutedText,
  },
  unreadBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  separator: {
    height: 1,
    backgroundColor: APP_COLORS.border,
    marginLeft: 72,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: APP_COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: APP_COLORS.mutedText,
    textAlign: "center",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.canvas,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  backButton: {
    padding: 4,
  },
  chatHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: "700",
    color: APP_COLORS.text,
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: APP_COLORS.mutedText,
  },
  messagesList: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  messageContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  messageOwn: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  messageBubbleOwn: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  messageText: {
    fontSize: 15,
    color: APP_COLORS.text,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: "#FFFFFF",
  },
  messageTime: {
    marginTop: 4,
    fontSize: 11,
    color: APP_COLORS.mutedText,
    textAlign: "right",
  },
  messageTimeOwn: {
    color: "rgba(255,255,255,0.7)",
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: APP_COLORS.canvas,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: APP_COLORS.text,
    maxHeight: 120,
    paddingVertical: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
