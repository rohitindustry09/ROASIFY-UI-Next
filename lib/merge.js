import { buildColumnMap } from "./fileParse.js";

const MONTH_MAP = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

function toNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/,/g, "").replace(/[₹$]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function splitMetaId(val) {
  const s = String(val ?? "");
  const m = s.match(/^\s*(\d+)\s*,\s*([\s\S]*)$/);
  if (m) return [m[1], m[2].trim()];
  return [null, s.trim()];
}

function parseMetaMonth(val) {
  const s = String(val ?? "");
  const m = s.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function parseShopifyMonth(val) {
  const s = String(val ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function parseGoogleMonth(val) {
  const s = String(val ?? "").trim();
  const parts = s.split(/\s+/);
  if (parts.length === 2) {
    const key = parts[0].toLowerCase();
    if (MONTH_MAP[key]) return `${parts[1]}-${MONTH_MAP[key]}`;
  }
  // also handle "2026-07" style directly
  const m = s.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function extractGoogleVariant(itemId) {
  const s = String(itemId ?? "").trim();
  let m = s.match(/^shopify_[a-z]+_(\d+)_(\d+)$/i);
  if (m) return m[2];
  if (/^\d+$/.test(s)) return s;
  return null;
}

const META_COLS = {
  productId: ["product id"],
  month: ["month"],
  spend: ["amount spent"],
  landingViews: ["landing page views"],
  ctr: ["ctr"],
  cpm: ["cpm"],
};

const SHOPIFY_COLS = {
  month: ["month"],
  variantTitle: ["product variant title"],
  variantId: ["product variant id"],
  productTitle: ["product title"],
  totalSales: ["total sales"],
  itemsSold: ["net items sold"],
};

const GOOGLE_COLS = {
  month: ["month"],
  productTitle: ["product title"],
  itemId: ["item id"],
  cost: ["cost"],
  conversions: ["conversions"],
};

export function requiredFragmentsFor(source) {
  if (source === "meta") return ["product id", "amount spent"];
  if (source === "shopify") return ["product variant id", "total sales"];
  if (source === "google") return ["item id", "cost"];
  return [];
}

/** Aggregate raw Meta rows by variant_id, summing across all months present
 *  (or only the months in `monthFilter` if provided as a Set of "YYYY-MM"). */
export function aggregateMeta(rows, monthFilter = null) {
  if (!rows.length) return new Map();
  const cols = buildColumnMap(Object.keys(rows[0]), META_COLS);
  const byVariant = new Map();

  for (const row of rows) {
    if (monthFilter) {
      const month = parseMetaMonth(row[cols.month]);
      if (!month || !monthFilter.has(month)) continue;
    }
    const [variantId, title] = splitMetaId(row[cols.productId]);
    if (!variantId) continue;
    const spend = toNum(row[cols.spend]);
    const ctr = toNum(row[cols.ctr]);
    const cpm = toNum(row[cols.cpm]);
    const impressions = cpm > 0 ? (spend / cpm) * 1000 : 0;
    const clicks = impressions * (ctr / 100);

    let acc = byVariant.get(variantId);
    if (!acc) {
      acc = { variantId, spend: 0, impressions: 0, clicks: 0, titles: new Map() };
      byVariant.set(variantId, acc);
    }
    acc.spend += spend;
    acc.impressions += impressions;
    acc.clicks += clicks;
    if (title) acc.titles.set(title, (acc.titles.get(title) || 0) + 1);
  }

  for (const acc of byVariant.values()) {
    acc.ctrPct = acc.impressions > 0 ? (acc.clicks / acc.impressions) * 100 : 0;
    acc.cpmInr = acc.impressions > 0 ? (acc.spend / acc.impressions) * 1000 : 0;
    acc.title = mostFrequent(acc.titles);
  }
  return byVariant;
}

export function aggregateGoogle(rows, monthFilter = null) {
  if (!rows.length) return new Map();
  const cols = buildColumnMap(Object.keys(rows[0]), GOOGLE_COLS);
  const byVariant = new Map();

  for (const row of rows) {
    if (monthFilter) {
      const month = parseGoogleMonth(row[cols.month]);
      if (!month || !monthFilter.has(month)) continue;
    }
    const variantId = extractGoogleVariant(row[cols.itemId]);
    if (!variantId) continue;
    const cost = toNum(row[cols.cost]);
    const conv = toNum(row[cols.conversions]);
    let acc = byVariant.get(variantId);
    if (!acc) {
      acc = { variantId, cost: 0, conversions: 0 };
      byVariant.set(variantId, acc);
    }
    acc.cost += cost;
    acc.conversions += conv;
  }
  return byVariant;
}

export function aggregateShopify(rows, monthFilter = null) {
  if (!rows.length) return new Map();
  const cols = buildColumnMap(Object.keys(rows[0]), SHOPIFY_COLS);
  const byVariant = new Map();
  let zeroIdCounter = 0;

  for (const row of rows) {
    if (monthFilter) {
      const month = parseShopifyMonth(row[cols.month]);
      if (!month || !monthFilter.has(month)) continue;
    }
    const rawId = row[cols.variantId];
    if (rawId === undefined || rawId === null || rawId === "") continue;
    let variantId = String(Math.trunc(toNum(rawId)));
    if (variantId === "0") {
      // Shopify reports variant id 0 for line items that aren't tied to a real
      // product variant (custom/manual line items, etc). These are unrelated
      // to each other, so give each its own synthetic id instead of silently
      // merging unrelated revenue into one fake "product".
      variantId = `_unmatched_${zeroIdCounter++}`;
    }
    const revenue = toNum(row[cols.totalSales]);
    const items = toNum(row[cols.itemsSold]);
    const productTitle = String(row[cols.productTitle] ?? "").trim() || "(untitled)";
    const variantTitle = String(row[cols.variantTitle] ?? "").trim();

    let acc = byVariant.get(variantId);
    if (!acc) {
      acc = { variantId, revenue: 0, items: 0, productTitles: new Map(), variantTitles: new Map() };
      byVariant.set(variantId, acc);
    }
    acc.revenue += revenue;
    acc.items += items;
    acc.productTitles.set(productTitle, (acc.productTitles.get(productTitle) || 0) + 1);
    acc.variantTitles.set(variantTitle, (acc.variantTitles.get(variantTitle) || 0) + 1);
  }

  for (const acc of byVariant.values()) {
    acc.productTitle = mostFrequent(acc.productTitles);
    acc.variantTitle = mostFrequent(acc.variantTitles);
  }
  return byVariant;
}

/** Scan raw rows for one source and return the sorted set of "YYYY-MM" months present. */
export function extractMonths(rows, source) {
  if (!rows || !rows.length) return [];
  const parser = source === "meta" ? parseMetaMonth : source === "shopify" ? parseShopifyMonth : parseGoogleMonth;
  const colKey = source === "meta" ? META_COLS.month : source === "shopify" ? SHOPIFY_COLS.month : GOOGLE_COLS.month;
  const cols = buildColumnMap(Object.keys(rows[0]), { month: colKey });
  const set = new Set();
  for (const row of rows) {
    const m = parser(row[cols.month]);
    if (m) set.add(m);
  }
  return [...set].sort();
}

/** "2026-05" -> "May 2026" */
export function formatMonthLabel(ym) {
  const [y, m] = ym.split("-");
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] || m} ${y}`;
}

function mostFrequent(counterMap) {
  let best = null, bestCount = -1;
  for (const [k, c] of counterMap.entries()) {
    if (c > bestCount) { best = k; bestCount = c; }
  }
  return best;
}

/**
 * Full outer-join merge across the three aggregated sources, matching the
 * ROASify methodology: Total Spend = Meta Spend + Google Cost,
 * ROI = Revenue / Total Spend, quadrant thresholds = per-product averages.
 */
export function mergeAll({ metaMap, shopifyMap, googleMap }) {
  const ids = new Set([
    ...(metaMap ? metaMap.keys() : []),
    ...(shopifyMap ? shopifyMap.keys() : []),
    ...(googleMap ? googleMap.keys() : []),
  ]);

  const rows = [];
  for (const id of ids) {
    const m = metaMap?.get(id);
    const s = shopifyMap?.get(id);
    const g = googleMap?.get(id);

    const metaSpend = m?.spend || 0;
    const googleCost = g?.cost || 0;
    const totalSpend = metaSpend + googleCost;
    const revenue = s?.revenue || 0;
    const items = s?.items || 0;
    const roi = totalSpend > 0 ? revenue / totalSpend : revenue > 0 ? Infinity : 0;

    rows.push({
      id,
      productTitle: s?.productTitle || m?.title || "(unknown product)",
      variantTitle: s?.variantTitle || "",
      hasShopifyMatch: Boolean(s),
      metaSpend,
      googleCost,
      totalSpend,
      revenue,
      roi,
      items,
      ctr: m?.ctrPct || 0,
      cpm: m?.cpmInr || 0,
      conversions: g?.conversions || 0,
    });
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.metaSpend += r.metaSpend;
      acc.googleCost += r.googleCost;
      acc.totalSpend += r.totalSpend;
      acc.revenue += r.revenue;
      acc.items += r.items;
      return acc;
    },
    { metaSpend: 0, googleCost: 0, totalSpend: 0, revenue: 0, items: 0 }
  );
  totals.products = rows.length;
  totals.roi = totals.totalSpend > 0 ? totals.revenue / totals.totalSpend : 0;

  const spendThreshold = rows.length ? totals.totalSpend / rows.length : 0;
  const revenueThreshold = rows.length ? totals.revenue / rows.length : 0;

  for (const r of rows) {
    const highRev = r.revenue >= revenueThreshold;
    const highSpend = r.totalSpend >= spendThreshold;
    r.quadrant = highRev
      ? highSpend ? "contenders" : "champions"
      : highSpend ? "casualties" : "cruisers";
  }

  return { rows, totals, spendThreshold, revenueThreshold };
}

export function quadrantSummary(rows) {
  const buckets = { champions: [], contenders: [], cruisers: [], casualties: [] };
  for (const r of rows) buckets[r.quadrant].push(r);
  const out = {};
  for (const [k, list] of Object.entries(buckets)) {
    const spend = list.reduce((a, r) => a + r.totalSpend, 0);
    const revenue = list.reduce((a, r) => a + r.revenue, 0);
    out[k] = {
      products: list.length,
      spend,
      revenue,
      roi: spend > 0 ? revenue / spend : 0,
      rows: list,
    };
  }
  return out;
}
