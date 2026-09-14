// Encrypts OAuth access/refresh tokens before they're written to Postgres,
// so a database leak alone doesn't expose usable tokens. Uses a separate
// key (ENCRYPTION_KEY) from the session-signing key (SESSION_SECRET) --
// deliberately: rotating one shouldn't force rotating the other, and a
// leak of one key shouldn't compromise both purposes.

async function deriveKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY is not set — add it to .env.local");
  // Hash the passphrase down to exactly 32 bytes so ENCRYPTION_KEY can be
  // any length the person generates, not a precise byte count.
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toB64(bytes) {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str);
}
function fromB64(b64) {
  return new Uint8Array([...atob(b64)].map((c) => c.charCodeAt(0)));
}

export async function encryptSecret(plaintext) {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  // Store as iv:ciphertext, both base64 — the IV isn't secret, it just has
  // to be unique per encryption, which crypto.getRandomValues guarantees.
  return `${toB64(iv)}:${toB64(new Uint8Array(ciphertext))}`;
}

export async function decryptSecret(stored) {
  const [ivB64, dataB64] = stored.split(":");
  if (!ivB64 || !dataB64) throw new Error("Malformed encrypted value");
  const key = await deriveKey();
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) },
    key,
    fromB64(dataB64)
  );
  return new TextDecoder().decode(plaintextBuf);
}
