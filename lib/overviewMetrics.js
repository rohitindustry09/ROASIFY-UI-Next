// Turns each platform's API response into one shape, then combines whichever
// accounts the user ticked. Money is never added across currencies: totals
// are kept per currency, and a blended ROAS is only produced when revenue and
// ad spend are each in a single, identical currency.

export function normalizeShopify(data) {
  const last = data?.last30d;
  if (!last) return { revenue: null, orders: null, currency: data?.currency ?? null };
  return {
    revenue: last.revenue,
    orders: last.orders,
    currency: last.currency ?? data.currency ?? null,
    truncated: last.truncated,
  };
}

export function normalizeMeta(data) {
  const a = data?.accounts?.[0];
  if (!a) return null;
  return { spend: a.spend, impressions: a.impressions, clicks: a.clicks, currency: a.currency ?? null };
}

export function normalizeGoogle(data) {
  const t = data?.totals;
  if (!t) return null;
  return {
    spend: t.cost,
    impressions: t.impressions,
    clicks: t.clicks,
    conversions: t.conversions,
    currency: data.currency ?? null,
  };
}

function addTo(map, currency, amount) {
  const key = currency || "UNKNOWN";
  return { ...map, [key]: (map[key] || 0) + amount };
}

// Returns { value, currency } or null when it can't be computed honestly.
export function blendedRoas({ revenueByCurrency, spendByCurrency }) {
  const revenueCurrencies = Object.keys(revenueByCurrency);
  const spendCurrencies = Object.keys(spendByCurrency);
  if (revenueCurrencies.length !== 1 || spendCurrencies.length !== 1) return null;
  if (revenueCurrencies[0] !== spendCurrencies[0] || revenueCurrencies[0] === "UNKNOWN") return null;
  const spend = spendByCurrency[spendCurrencies[0]];
  if (!(spend > 0)) return null;
  return { value: revenueByCurrency[revenueCurrencies[0]] / spend, currency: revenueCurrencies[0] };
}

// items: [{ platform: "shopify" | "meta" | "google", metrics }]
export function combine(items) {
  let acc = {
    revenueByCurrency: {},
    spendByCurrency: {},
    orders: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    partialRevenue: false,
  };
  for (const { platform, metrics } of items) {
    if (!metrics) continue;
    if (platform === "shopify" && metrics.revenue != null) {
      acc = {
        ...acc,
        revenueByCurrency: addTo(acc.revenueByCurrency, metrics.currency, metrics.revenue),
        orders: acc.orders + (metrics.orders || 0),
        partialRevenue: acc.partialRevenue || Boolean(metrics.truncated),
      };
    } else if (platform === "meta" || platform === "google") {
      acc = {
        ...acc,
        spendByCurrency: addTo(acc.spendByCurrency, metrics.currency, metrics.spend || 0),
        impressions: acc.impressions + (metrics.impressions || 0),
        clicks: acc.clicks + (metrics.clicks || 0),
        conversions: acc.conversions + (metrics.conversions || 0),
      };
    }
  }
  return {
    ...acc,
    ctr: acc.impressions > 0 ? (acc.clicks / acc.impressions) * 100 : 0,
    roas: blendedRoas(acc),
  };
}

export function formatMoneyMap(map, formatter) {
  const entries = Object.entries(map);
  if (entries.length === 0) return "—";
  return entries.map(([currency, amount]) => formatter(amount, currency)).join(" + ");
}
