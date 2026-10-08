import { apiRequest } from "./platform-api";

const KEY_PREFIX = "careerly-e2ee-private-key:";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const registeredIdentities = new Map<string, Promise<void>>();
const recipientKeys = new Map<string, Promise<string>>();

const toBase64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
const toUrlBase64 = (bytes: ArrayBuffer) => toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

type StoredKey = JsonWebKey;

async function identityKey(userId: string): Promise<CryptoKeyPair> {
  const saved = localStorage.getItem(`${KEY_PREFIX}${userId}`);
  if (saved) {
    const privateKey = await crypto.subtle.importKey("jwk", JSON.parse(saved) as StoredKey, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
    // The public half can be recreated only by generating a pair, so fetch it
    // from the registered private-key metadata below when it is needed.
    const publicJwk = JSON.parse(saved) as StoredKey;
    if (publicJwk.x && publicJwk.y) {
      const publicKey = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: publicJwk.x, y: publicJwk.y, ext: true }, { name: "ECDH", namedCurve: "P-256" }, true, []);
      return { privateKey, publicKey };
    }
  }
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify({ ...privateJwk, x: publicJwk.x, y: publicJwk.y }));
  return pair;
}

export async function enableSecureMessaging(userId: string): Promise<void> {
  const existing = registeredIdentities.get(userId);
  if (existing) return existing;
  const registration = (async () => {
    const pair = await identityKey(userId);
    const publicKey = toBase64(await crypto.subtle.exportKey("spki", pair.publicKey));
    await apiRequest("/messages/identity-key", { method: "PUT", body: JSON.stringify({ publicKey }) });
  })();
  registeredIdentities.set(userId, registration);
  try { await registration; } catch (error) { registeredIdentities.delete(userId); throw error; }
}

async function sharedKey(myUserId: string, peerPublicKey: string): Promise<CryptoKey> {
  const mine = await identityKey(myUserId);
  const peer = await crypto.subtle.importKey("spki", fromBase64(peerPublicKey), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, mine.privateKey, 256);
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptMessage(myUserId: string, recipient: { userId?: string; email?: string }, plaintext: string): Promise<string> {
  await enableSecureMessaging(myUserId);
  const query = recipient.userId ? `toUserId=${encodeURIComponent(recipient.userId)}` : `toEmail=${encodeURIComponent(recipient.email || "")}`;
  const cacheKey = recipient.userId || recipient.email?.trim().toLowerCase() || "";
  let peerKey = recipientKeys.get(cacheKey);
  if (!peerKey) {
    peerKey = apiRequest<{ publicKey: string }>(`/messages/recipient-key?${query}`).then(({ publicKey }) => publicKey);
    recipientKeys.set(cacheKey, peerKey);
  }
  const publicKey = await peerKey;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sharedKey(myUserId, publicKey), encoder.encode(plaintext));
  return `e2ee:v1:${toUrlBase64(iv.buffer)}:${toUrlBase64(ciphertext)}`;
}

export async function decryptMessage(myUserId: string, peerPublicKey: string | undefined, envelope: string): Promise<string | null> {
  const match = /^e2ee:v1:([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/.exec(envelope);
  if (!match || !peerPublicKey) return match ? null : envelope; // existing pre-E2EE history remains readable.
  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(match[1]) }, await sharedKey(myUserId, peerPublicKey), fromBase64(match[2]));
    return decoder.decode(plaintext);
  } catch { return null; }
}
