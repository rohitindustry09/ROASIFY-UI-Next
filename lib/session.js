import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/lib/crypto";

const COOKIE_NAME = "roasify_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Builds the Set-Cookie value for a logged-in session. Call this from a
// route handler and attach it via response.cookies.set(...).
export async function buildSessionCookie(email) {
  const value = await signToken({ email, iat: Date.now() });
  return {
    name: COOKIE_NAME,
    value,
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

// Use in Server Components / route handlers (has access to next/headers).
export async function getSession() {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

// Use in middleware, which reads cookies off the request instead.
export async function getSessionFromRequest(request) {
  return verifyToken(request.cookies.get(COOKIE_NAME)?.value);
}

export { COOKIE_NAME };
