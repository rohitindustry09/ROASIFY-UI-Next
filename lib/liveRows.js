// Turns live API data from Shopify, Meta and Google into rows with the SAME
// columns as the exports users upload on the Upload & merge page. Feeding
// these rows to the existing aggregate*/mergeAll code means connected
// accounts and uploaded files produce identical analysis.

export const SUPPORTED_DAY_RANGES = [7, 30, 90];

const ymd = (date) => date.toISOString().slice(0, 10);

// { since, until, month } -- dates as YYYY-MM-DD, month as YYYY-MM-01
export function dateRange(days, now = new Date()) {
  const until = ymd(now);
  const since = ymd(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  return { since, until, month: `${until.slice(0, 7)}-01` };
}

// Catalog / Merchant Center ids look like "shopify_IN_<productId>_<variantId>"
// (or are already a bare variant id). Returns the variant id, or null.
export function variantIdFromCatalogId(value) {
  const s = String(value ?? "").trim();
  const m = s.match(/^shopify_[a-z]+_(\d+)_(\d+)$/i);
  if (m) return m[2];
  return /^\d+$/.test(s) ? s : null;
}

function gidTail(gid) {
  const tail = String(gid ?? "").split("/").pop();
  return /^\d+$/.test(tail) ? tail : null;
}

// orders: [{ createdAt, lineItems: [{ title, variantTitle, quantity,
//   currentQuantity, variantId (gid or null), amount }] }]
// Revenue is scaled by the share of each line still standing after refunds
// or edits, and quantity is the net quantity -- like "net items sold".
export function shopifyOrdersToRows(orders) {
  const grouped = new Map();
  const standalone = [];

  for (const order of orders) {
    const month = `${String(order.createdAt).slice(0, 7)}-01`;
    for (const li of order.lineItems) {
      const quantity = Number(li.quantity) || 0;
      const current = li.currentQuantity == null ? quantity : Number(li.currentQuantity) || 0;
      if (quantity <= 0 || current <= 0) continue;

      const sales = (Number(li.amount) || 0) * (current / quantity);
      const variantId = gidTail(li.variantId) ?? "0";
      const base = {
        Month: month,
        "Product variant title": li.variantTitle || "",
        "Product variant ID": variantId,
        "Product title": li.title || "",
      };

      if (variantId === "0") {
        // Custom / deleted-variant lines aren't one product; keep them apart.
        standalone.push({ ...base, "Total sales": sales, "Net items sold": current });
        continue;
      }
      const key = `${month}|${variantId}`;
      const prev = grouped.get(key);
      grouped.set(key, {
        ...base,
        "Total sales": (prev?.["Total sales"] || 0) + sales,
        "Net items sold": (prev?.["Net items sold"] || 0) + current,
      });
    }
  }
  return [...grouped.values(), ...standalone];
}

// insights: Meta rows with a product_id breakdown.
export function metaInsightsToRows(insights, month) {
  const rows = [];
  for (const r of insights) {
    const variantId = variantIdFromCatalogId(r.product_id);
    if (!variantId) continue;
    rows.push({
      "Product ID": `${variantId}, ${r.product_name || ""}`.trimEnd(),
      Month: month,
      "Amount spent": Number(r.spend) || 0,
      "CTR": Number(r.ctr) || 0,
      "CPM": Number(r.cpm) || 0,
    });
  }
  return rows;
}

// results: Google Ads shopping_performance_view rows.
export function googleResultsToRows(results, month) {
  const rows = [];
  for (const r of results) {
    const itemId = r.segments?.productItemId;
    if (!variantIdFromCatalogId(itemId)) continue;
    rows.push({
      Month: month,
      "Product title": r.segments?.productTitle || "",
      "Item ID": itemId,
      Cost: (Number(r.metrics?.costMicros) || 0) / 1_000_000,
      Conversions: Number(r.metrics?.conversions) || 0,
    });
  }
  return rows;
}
