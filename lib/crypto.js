function getSecretBytes() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set — add it to .env.local");
  return new TextEncoder().encode(s);
}

async function importKey() {
  return crypto.subtle.importKey(
    "raw",
    getSecretBytes(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function toBase64Url(bytes) {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
}

export function encodeJson(obj) {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

export function decodeJson(b64url) {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(b64url)));
}

export async function sign(payload) {
  const key = await importKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

export async function verifySigned(payload, signature) {
  const key = await importKey();
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

// Builds a "payload.signature" token and verifies it back. Both halves
// live here so session cookies and OTP challenge cookies share one
// implementation instead of drifting apart.
//
// Every token carries a `typ` that verifyToken must match, so a token minted
// for one purpose (an OAuth state, say) can never be replayed as another (a
// session cookie). Tokens are signed, NOT encrypted: never put a secret in
// the payload.
export async function signToken(obj, typ) {
  if (!typ) throw new Error("signToken requires a token type");
  const payload = encodeJson({ ...obj, typ });
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function verifyToken(token, typ) {
  if (!token || !typ) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [payload, signature] = parts;
  const valid = await verifySigned(payload, signature);
  if (!valid) return null;
  try {
    const data = decodeJson(payload);
    return data && data.typ === typ ? data : null;
  } catch {
    return null;
  }
}

// Constant-time comparison for equal-length strings (hashes/MACs).
export function timingSafeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

// Lowercases and trims so A@x.com and a@x.com are the same account.
export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}
