import { cookies } from "next/headers";

const COOKIE_NAME = "roasify_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

function toBase64Url(bytes) {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
}

async function sign(payload) {
  const key = await importKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

async function verifySignature(payload, signature) {
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

// Builds the Set-Cookie value for a logged-in session. Call this from a
// route handler and attach it via response.cookies.set(...).
export async function buildSessionCookie(email) {
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ email, iat: Date.now() }))
  );
  const signature = await sign(payload);
  return {
    name: COOKIE_NAME,
    value: `${payload}.${signature}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  };
}

export function clearSessionCookie() {
  return { name: COOKIE_NAME, value: "", options: { path: "/", maxAge: 0 } };
}

async function verify(rawCookieValue) {
  if (!rawCookieValue) return null;
  const [payload, signature] = rawCookieValue.split(".");
  if (!payload || !signature) return null;

  const valid = await verifySignature(payload, signature);
  if (!valid) return null;

  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
  } catch {
    return null;
  }
}

// Use in Server Components / route handlers (has access to next/headers).
export async function getSession() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return verify(raw);
}

// Use in middleware, which reads cookies off the request instead.
export async function getSessionFromRequest(request) {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  return verify(raw);
}

export { COOKIE_NAME };
