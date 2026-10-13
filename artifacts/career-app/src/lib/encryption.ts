export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );

  const publicKeySpki = await crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey,
  );
  const publicKeyB64 = btoa(
    String.fromCharCode(...new Uint8Array(publicKeySpki)),
  );

  return { publicKey: publicKeyB64, privateKey: keyPair.privateKey };
}

export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const binary = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "spki",
    binary,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
}

export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMessage(
  sharedKey: CryptoKey,
  plaintext: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    encoder.encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return "e2ee:v1:" + btoa(String.fromCharCode(...combined));
}

export async function decryptMessage(
  sharedKey: CryptoKey,
  encrypted: string,
): Promise<string> {
  if (!encrypted.startsWith("e2ee:v1:")) return encrypted;
  const binary = Uint8Array.from(atob(encrypted.slice(8)), (c) =>
    c.charCodeAt(0),
  );
  const iv = binary.slice(0, 12);
  const ciphertext = binary.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

const STORAGE_KEY = "careerly:e2ee:keys";

export function loadLocalKeys(): {
  publicKey: string;
  privateKeyB64: string;
} | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function saveLocalKeys(publicKey: string, privateKey: CryptoKey): void {
  crypto.subtle.exportKey("pkcs8", privateKey).then((privateKeyPkcs8) => {
    try {
      const privateKeyB64 = btoa(
        String.fromCharCode(...new Uint8Array(privateKeyPkcs8)),
      );
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ publicKey, privateKeyB64 }),
      );
    } catch {}
  });
}

export async function loadPrivateKey(
  privateKeyB64: string,
): Promise<CryptoKey> {
  const binary = Uint8Array.from(atob(privateKeyB64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
}
