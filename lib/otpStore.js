// In-memory store, resets whenever the server restarts. Fine for local dev,
// not for production — swap this for Redis (or a real auth provider) before
// deploying with more than one server instance.
const codes = new Map(); // email -> { code, expiresAt }

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function issueCode(email) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(email, { code, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

export function verifyCode(email, code) {
  const entry = codes.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    codes.delete(email);
    return false;
  }
  const ok = entry.code === code;
  if (ok) codes.delete(email); // one-time use
  return ok;
}
