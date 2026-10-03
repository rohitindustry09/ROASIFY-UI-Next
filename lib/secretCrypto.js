// Encrypts OAuth access/refresh tokens before they're written to Postgres,
// so a database leak alone doesn't expose usable tokens. Uses a separate
// key (ENCRYPTION_KEY) from the session-signing key (SESSION_SECRET) --
// deliberately: rotating one shouldn't force rotating the other, and a
// leak of one key shouldn't compromise both purposes.

const MIN_KEY_LENGTH = 32;
const FORMAT_VERSION = "v1";

// ENCRYPTION_KEY should be a long random value (openssl rand -base64 32).
// A short/guessable passphrase would make the single SHA-256 derivation below
// brute-forceable, so refuse to run with one.
async function deriveKey(secret) {
  if (!secret) throw new Error("ENCRYPTION_KEY is not set — add it to .env.local");
  if (secret.length < MIN_KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be at least ${MIN_KEY_LENGTH} characters (use: openssl rand -base64 32)`);
  }
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
  const key = await deriveKey(process.env.ENCRYPTION_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  // Stored as "v1:iv:ciphertext" (base64 parts). The IV isn't secret, it just
  // has to be unique per encryption; the version prefix lets the format change
  // later without breaking existing rows.
  return `${FORMAT_VERSION}:${toB64(iv)}:${toB64(new Uint8Array(ciphertext))}`;
}

async function decryptWith(secret, ivB64, dataB64) {
  const key = await deriveKey(secret);
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) },
    key,
    fromB64(dataB64)
  );
  return new TextDecoder().decode(plaintextBuf);
}

// Key rotation: set the new key as ENCRYPTION_KEY and the old one as
// ENCRYPTION_KEY_PREVIOUS; rows encrypted with either still decrypt. Remove
// the previous key once every row has been re-saved.
export async function decryptSecret(stored) {
  const parts = String(stored).split(":");
  // Legacy rows were "iv:ciphertext" with no version prefix.
  const [ivB64, dataB64] = parts[0] === FORMAT_VERSION ? parts.slice(1) : parts;
  if (!ivB64 || !dataB64) throw new Error("Malformed encrypted value");
  try {
    return await decryptWith(process.env.ENCRYPTION_KEY, ivB64, dataB64);
  } catch (err) {
    if (!process.env.ENCRYPTION_KEY_PREVIOUS) throw err;
    return decryptWith(process.env.ENCRYPTION_KEY_PREVIOUS, ivB64, dataB64);
  }
}
