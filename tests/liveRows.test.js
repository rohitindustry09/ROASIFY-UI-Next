import { describe, it, expect } from "vitest";
import {
  dateRange,
  variantIdFromCatalogId,
  shopifyOrdersToRows,
  metaInsightsToRows,
  googleResultsToRows,
} from "@/lib/liveRows";
import { aggregateShopify, aggregateMeta, aggregateGoogle, mergeAll } from "@/lib/merge";

const li = (over = {}) => ({
  title: "Mug",
  variantTitle: "Blue",
  quantity: 2,
  currentQuantity: 2,
  variantId: "gid://shopify/ProductVariant/111",
  amount: "100",
  ...over,
});

describe("dateRange", () => {
  it("covers the requested number of days inclusive of today", () => {
    const r = dateRange(30, new Date("2026-10-05T12:00:00Z"));
    expect(r).toEqual({ since: "2026-09-06", until: "2026-10-05", month: "2026-10-01" });
  });
});

describe("variantIdFromCatalogId", () => {
  it("handles shopify catalog ids, bare ids and junk", () => {
    expect(variantIdFromCatalogId("shopify_IN_555_111")).toBe("111");
    expect(variantIdFromCatalogId("111")).toBe("111");
    expect(variantIdFromCatalogId("abc-123")).toBeNull();
    expect(variantIdFromCatalogId(undefined)).toBeNull();
  });
});

describe("shopifyOrdersToRows", () => {
  it("sums a variant across orders in a month", () => {
    const rows = shopifyOrdersToRows([
      { createdAt: "2026-10-01T10:00:00Z", lineItems: [li()] },
      { createdAt: "2026-10-03T10:00:00Z", lineItems: [li({ amount: "50", quantity: 1, currentQuantity: 1 })] },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Total sales"]).toBe(150);
    expect(rows[0]["Net items sold"]).toBe(3);
  });
  it("reduces revenue for refunded quantity and skips fully removed lines", () => {
    const rows = shopifyOrdersToRows([
      {
        createdAt: "2026-10-01T10:00:00Z",
        lineItems: [li({ currentQuantity: 1 }), li({ variantId: "gid://shopify/ProductVariant/222", currentQuantity: 0 })],
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Total sales"]).toBe(50);
    expect(rows[0]["Net items sold"]).toBe(1);
  });
  it("keeps lines without a variant separate", () => {
    const rows = shopifyOrdersToRows([
      { createdAt: "2026-10-01T10:00:00Z", lineItems: [li({ variantId: null }), li({ variantId: null })] },
    ]);
    expect(rows).toHaveLength(2);
  });
});

describe("live rows feed the existing merge unchanged", () => {
  it("merges shopify + meta + google by variant id like uploaded files do", () => {
    const shopify = aggregateShopify(
      shopifyOrdersToRows([{ createdAt: "2026-10-01T00:00:00Z", lineItems: [li({ amount: "1000", quantity: 1, currentQuantity: 1 })] }])
    );
    const meta = aggregateMeta(
      metaInsightsToRows([{ product_id: "shopify_IN_555_111", spend: "100", ctr: "2", cpm: "50" }], "2026-10-01")
    );
    const google = aggregateGoogle(
      googleResultsToRows(
        [{ segments: { productItemId: "shopify_IN_555_111", productTitle: "Mug" }, metrics: { costMicros: "50000000", conversions: 2 } }],
        "2026-10-01"
      )
    );
    const merged = mergeAll({ metaMap: meta, shopifyMap: shopify, googleMap: google });
    const row = merged.rows.find((r) => r.id === "111");
    expect(row.revenue).toBe(1000);
    expect(row.metaSpend).toBe(100);
    expect(row.googleCost).toBe(50);
    expect(row.roi).toBeCloseTo(1000 / 150);
    expect(row.productTitle).toBe("Mug");
  });
  it("drops ads for products it cannot map to a variant", () => {
    expect(metaInsightsToRows([{ product_id: "no-id", spend: "5" }], "2026-10-01")).toEqual([]);
    expect(googleResultsToRows([{ segments: { productItemId: "x" }, metrics: {} }], "2026-10-01")).toEqual([]);
  });
});
