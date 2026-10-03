import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimal in-memory stand-in for the one Supabase table otpStore uses.
const rows = new Map();
function table() {
  const q = { filters: [], op: "select", patch: null, row: null };
  const match = () => [...rows.values()].filter((r) => q.filters.every(([k, v]) => r[k] === v));
  const run = () => {
    if (q.op === "upsert") { rows.set(q.row.email, { ...q.row }); return { data: null, error: null }; }
    const hit = match();
    if (q.op === "update") { hit.forEach((r) => Object.assign(r, q.patch)); return { data: hit.map((r) => ({ email: r.email })), error: null }; }
    if (q.op === "delete") { hit.forEach((r) => rows.delete(r.email)); return { data: hit.map((r) => ({ email: r.email })), error: null }; }
    return { data: hit[0] ?? null, error: null };
  };
  const b = {
    select: () => b,
    eq: (k, v) => (q.filters.push([k, v]), b),
    update: (p) => ((q.op = "update"), (q.patch = p), b),
    delete: () => ((q.op = "delete"), b),
    upsert: (r) => ((q.op = "upsert"), (q.row = r), b),
    maybeSingle: () => Promise.resolve(run()),
    then: (res, rej) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}
vi.mock("@/lib/db", () => ({ getDb: () => ({ from: () => table() }) }));

const { createChallenge, consumeChallenge, MAX_VERIFY_ATTEMPTS, RESEND_COOLDOWN_MS, MAX_SENDS_PER_WINDOW } =
  await import("@/lib/otpStore");

const E = "u@x.co";
beforeEach(() => rows.clear());

describe("otp challenges", () => {
  it("accepts the right code once, then rejects replay", async () => {
    await createChallenge(E, "123456");
    expect(await consumeChallenge(E, "123456")).toBe(true);
    expect(await consumeChallenge(E, "123456")).toBe(false);
  });
  it("burns the challenge after too many wrong guesses", async () => {
    await createChallenge(E, "123456");
    for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i++) expect(await consumeChallenge(E, "000000")).toBe(false);
    expect(await consumeChallenge(E, "123456")).toBe(false);
  });
  it("rejects expired codes", async () => {
    await createChallenge(E, "123456", Date.now() - 11 * 60 * 1000);
    expect(await consumeChallenge(E, "123456")).toBe(false);
  });
  it("enforces resend cooldown and hourly cap", async () => {
    const t0 = Date.now();
    expect((await createChallenge(E, "111111", t0)).ok).toBe(true);
    expect((await createChallenge(E, "222222", t0 + 1000)).ok).toBe(false);
    let t = t0;
    for (let i = 1; i < MAX_SENDS_PER_WINDOW; i++) {
      t += RESEND_COOLDOWN_MS + 1;
      expect((await createChallenge(E, "333333", t)).ok).toBe(true);
    }
    expect((await createChallenge(E, "444444", t + RESEND_COOLDOWN_MS + 1)).ok).toBe(false);
  });
  it("a new code invalidates the previous one", async () => {
    const t0 = Date.now() - 2 * RESEND_COOLDOWN_MS;
    await createChallenge(E, "111111", t0);
    await createChallenge(E, "222222", t0 + RESEND_COOLDOWN_MS + 1);
    expect(await consumeChallenge(E, "111111")).toBe(false);
  });
});
