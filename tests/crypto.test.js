import { describe, it, expect } from "vitest";
import { signToken, verifyToken, normalizeEmail, timingSafeEqual } from "@/lib/crypto";
import { verifySessionToken, buildSessionCookie } from "@/lib/session";
import { signShopifyState, verifyShopifyState, signGoogleState, verifyGoogleState } from "@/lib/shopifyOAuth";
import { encryptSecret, decryptSecret } from "@/lib/secretCrypto";
import { generateCode } from "@/lib/otpStore";


describe("signed tokens", () => {
  it("round-trips with matching type", async () => {
    const t = await signToken({ a: 1 }, "x");
    expect((await verifyToken(t, "x")).a).toBe(1);
  });
  it("rejects a token of a different type", async () => {
    const t = await signToken({ email: "a@b.co" }, "google-oauth-state");
    expect(await verifyToken(t, "session")).toBeNull();
  });
  it("rejects tampered payloads and malformed tokens", async () => {
    const t = await signToken({ a: 1 }, "x");
    const [p, s] = t.split(".");
    expect(await verifyToken(`${p}x.${s}`, "x")).toBeNull();
    expect(await verifyToken(`${t}.extra`, "x")).toBeNull();
    expect(await verifyToken("", "x")).toBeNull();
  });
});

describe("sessions", () => {
  it("accepts a fresh session cookie", async () => {
    const c = await buildSessionCookie("a@b.co");
    expect((await verifySessionToken(c.value)).email).toBe("a@b.co");
  });
  it("rejects an expired session", async () => {
    const t = await signToken({ email: "a@b.co", exp: Date.now() - 1 }, "session");
    expect(await verifySessionToken(t)).toBeNull();
  });
  it("rejects a legacy untyped / OTP-style token as a session", async () => {
    const t = await signToken({ email: "victim@b.co", exp: Date.now() + 1e6 }, "otp-challenge");
    expect(await verifySessionToken(t)).toBeNull();
  });
});

describe("oauth state", () => {
  it("binds shopify state to shop and user", async () => {
    const s = await signShopifyState({ shop: "a.myshopify.com", email: "u@x.co" });
    expect(await verifyShopifyState(s, { shop: "a.myshopify.com", email: "u@x.co" })).toBe(true);
    expect(await verifyShopifyState(s, { shop: "b.myshopify.com", email: "u@x.co" })).toBe(false);
    expect(await verifyShopifyState(s, { shop: "a.myshopify.com", email: "z@x.co" })).toBe(false);
  });
  it("binds google state to user and rejects shopify state", async () => {
    const g = await signGoogleState("u@x.co");
    expect(await verifyGoogleState(g, "u@x.co")).toBe(true);
    expect(await verifyGoogleState(g, "z@x.co")).toBe(false);
    const s = await signShopifyState({ shop: "a.myshopify.com", email: "u@x.co" });
    expect(await verifyGoogleState(s, "u@x.co")).toBe(false);
  });
});

describe("secret encryption", () => {
  it("round-trips and is versioned", async () => {
    const e = await encryptSecret("tok");
    expect(e.startsWith("v1:")).toBe(true);
    expect(await decryptSecret(e)).toBe("tok");
  });
  it("decrypts legacy unversioned values", async () => {
    const [, iv, ct] = (await encryptSecret("old")).split(":");
    expect(await decryptSecret(`${iv}:${ct}`)).toBe("old");
  });
});

describe("helpers", () => {
  it("normalizes email", () => expect(normalizeEmail("  A@X.Com ")).toBe("a@x.com"));
  it("timingSafeEqual", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "ab")).toBe(false);
  });
  it("generateCode yields 6 digits", () => {
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^[1-9]\d{5}$/);
  });
});
