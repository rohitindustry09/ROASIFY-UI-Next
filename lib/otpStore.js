import { getDb } from "@/lib/db";
import { sign, timingSafeEqual } from "@/lib/crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_SENDS_PER_WINDOW = 5;
export const SEND_WINDOW_MS = 60 * 60 * 1000;

// Uniform 6-digit code from a CSPRNG (rejection sampling avoids modulo bias).
export function generateCode() {
  const limit = 4294967296 - (4294967296 % 900000);
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return String(100000 + (buf[0] % 900000));
}

// Keyed hash (HMAC with SESSION_SECRET) so a database leak alone can't be
// brute-forced offline from the 1M-code space without the server secret.
export function hashCode(email, code) {
  return sign(`otp:${email}:${code}`);
}

// Records a new challenge for `email`, enforcing the resend cooldown and an
// hourly cap. Returns { ok: true } or { ok: false, retryAfterSec }.
export async function createChallenge(email, code, now = Date.now()) {
  const db = getDb();
  const { data: existing, error: readErr } = await db
    .from("otp_challenges")
    .select("last_sent_at, window_start, send_count")
    .eq("email", email)
    .maybeSingle();
  if (readErr) throw readErr;

  let windowStart = now;
  let sendCount = 1;
  if (existing) {
    const sinceLast = now - new Date(existing.last_sent_at).getTime();
    if (sinceLast < RESEND_COOLDOWN_MS) {
      return { ok: false, retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000) };
    }
    const existingWindowStart = new Date(existing.window_start).getTime();
    const windowAge = now - existingWindowStart;
    if (windowAge < SEND_WINDOW_MS) {
      if (existing.send_count >= MAX_SENDS_PER_WINDOW) {
        return { ok: false, retryAfterSec: Math.ceil((SEND_WINDOW_MS - windowAge) / 1000) };
      }
      windowStart = existingWindowStart;
      sendCount = existing.send_count + 1;
    }
  }

  const { error } = await db.from("otp_challenges").upsert(
    {
      email,
      code_hash: await hashCode(email, code),
      expires_at: new Date(now + OTP_TTL_MS).toISOString(),
      attempts: 0,
      last_sent_at: new Date(now).toISOString(),
      window_start: new Date(windowStart).toISOString(),
      send_count: sendCount,
    },
    { onConflict: "email" }
  );
  if (error) throw error;
  return { ok: true };
}

export async function discardChallenge(email) {
  const { error } = await getDb().from("otp_challenges").delete().eq("email", email);
  if (error) throw error;
}

// Checks a submitted code. Single-use: a correct code deletes the challenge,
// and the challenge is burned after MAX_VERIFY_ATTEMPTS wrong guesses.
export async function consumeChallenge(email, code, now = Date.now()) {
  const db = getDb();
  const { data, error } = await db
    .from("otp_challenges")
    .select("code_hash, expires_at, attempts")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  if (now > new Date(data.expires_at).getTime() || data.attempts >= MAX_VERIFY_ATTEMPTS) {
    await discardChallenge(email);
    return false;
  }

  // Count the attempt before comparing, guarded on the value we read, so
  // parallel guesses can't all be checked against the same counter. If the
  // guard misses (another request got there first) we reject this one.
  const { data: bumped, error: bumpErr } = await db
    .from("otp_challenges")
    .update({ attempts: data.attempts + 1 })
    .eq("email", email)
    .eq("attempts", data.attempts)
    .select("email");
  if (bumpErr) throw bumpErr;
  if (bumped.length !== 1) return false;

  const matches = timingSafeEqual(data.code_hash, await hashCode(email, String(code)));
  if (!matches) return false;

  // Delete-and-check so two concurrent correct submissions can't both win.
  const { data: deleted, error: delErr } = await db
    .from("otp_challenges")
    .delete()
    .eq("email", email)
    .eq("code_hash", data.code_hash)
    .select("email");
  if (delErr) throw delErr;
  return deleted.length === 1;
}
