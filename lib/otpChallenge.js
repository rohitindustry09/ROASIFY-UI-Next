import { signToken, verifyToken } from "@/lib/crypto";

const COOKIE_NAME = "roasify_otp_challenge";
const TTL_SECONDS = 10 * 60; // 10 minutes

// This challenge lives entirely in a signed cookie, not server memory —
// deliberately, so it works the same on a single dev server as it does
// across Vercel's serverless instances (an in-memory Map does not: two
// requests can land on different instances with no shared state).
//
// Tradeoff: because there's no server-side record of "already used," a
// valid code can be replayed within its 10-minute window if someone
// captured the exact cookie + code pair — which in practice requires
// access to the same browser session the email was delivered to. Closing
// that gap needs a shared store (Redis/Postgres) reachable from every
// instance; add one (e.g. Upstash Redis on Vercel) if you need strict
// single-use enforcement before launch.

export async function buildOtpChallengeCookie(email, code) {
  const value = await signToken({ email, code, exp: Date.now() + TTL_SECONDS * 1000 });
  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TTL_SECONDS,
    },
  };
}

export function clearOtpChallengeCookie() {
  return { name: COOKIE_NAME, value: "", options: { path: "/", maxAge: 0 } };
}

// Verifies the submitted email + code against the signed challenge cookie
// pulled off the request. Returns true/false — never throws on bad input.
export async function verifyOtpChallenge(rawCookieValue, email, code) {
  const challenge = await verifyToken(rawCookieValue);
  if (!challenge) return false;
  if (Date.now() > challenge.exp) return false;
  if (challenge.email !== email) return false;
  if (challenge.code !== code) return false;
  return true;
}

export { COOKIE_NAME as OTP_COOKIE_NAME };
