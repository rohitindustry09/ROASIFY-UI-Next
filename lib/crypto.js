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
export async function signToken(obj) {
  const payload = encodeJson(obj);
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function verifyToken(token) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const valid = await verifySigned(payload, signature);
  if (!valid) return null;
  try {
    return decodeJson(payload);
  } catch {
    return null;
  }
}
