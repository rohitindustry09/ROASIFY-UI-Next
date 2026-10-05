import { describe, it, expect } from "vitest";
import { combine, normalizeShopify, normalizeMeta, normalizeGoogle, blendedRoas } from "@/lib/overviewMetrics";

const shop = (revenue, currency = "INR", orders = 10) => ({ platform: "shopify", metrics: { revenue, orders, currency } });
const meta = (spend, currency = "INR") => ({ platform: "meta", metrics: { spend, impressions: 1000, clicks: 50, currency } });
const google = (spend, currency = "INR") => ({
  platform: "google",
  metrics: { spend, impressions: 500, clicks: 25, conversions: 3, currency },
});

describe("combine", () => {
  it("sums across accounts and computes ROAS in one currency", () => {
    const c = combine([shop(1000), shop(500), meta(200), google(100)]);
    expect(c.revenueByCurrency).toEqual({ INR: 1500 });
    expect(c.spendByCurrency).toEqual({ INR: 300 });
    expect(c.orders).toBe(20);
    expect(c.clicks).toBe(75);
    expect(c.ctr).toBeCloseTo(5);
    expect(c.roas).toEqual({ value: 5, currency: "INR" });
  });
  it("never blends different currencies", () => {
    const c = combine([shop(1000, "INR"), meta(100, "USD")]);
    expect(c.roas).toBeNull();
    expect(c.spendByCurrency).toEqual({ USD: 100 });
  });
  it("returns null ROAS with no spend and ignores accounts that failed", () => {
    expect(combine([shop(1000), { platform: "meta", metrics: null }]).roas).toBeNull();
  });
  it("does not mutate its inputs", () => {
    const items = [shop(1)];
    const snapshot = JSON.stringify(items);
    combine(items);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});

describe("normalizers", () => {
  it("shopify without 30-day data yields null revenue", () => {
    expect(normalizeShopify({ currency: "INR" }).revenue).toBeNull();
  });
  it("meta and google map to a common shape", () => {
    expect(normalizeMeta({ accounts: [{ spend: 5, impressions: 1, clicks: 1, currency: "USD" }] }).spend).toBe(5);
    expect(normalizeGoogle({ totals: { cost: 7, clicks: 1, impressions: 2, conversions: 3 }, currency: "INR" }).spend).toBe(7);
    expect(normalizeMeta({ accounts: [] })).toBeNull();
  });
});

describe("blendedRoas", () => {
  it("refuses unknown currency", () => {
    expect(blendedRoas({ revenueByCurrency: { UNKNOWN: 10 }, spendByCurrency: { UNKNOWN: 5 } })).toBeNull();
  });
});
