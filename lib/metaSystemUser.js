const API_VERSION = "v26.0";

// Carries Meta's own error code/message so callers can tell the user what is
// actually wrong (bad token vs missing permission vs wrong Business ID).
export class MetaApiError extends Error {
  constructor(status, body) {
    const err = body?.error ?? {};
    super(`Meta API request failed (${status}): ${err.message ?? "unknown error"}`);
    this.status = status;
    this.metaCode = err.code;
    this.metaMessage = err.message;
  }
}

// Turns a Meta failure into advice the user can act on.
export function describeMetaError(err) {
  if (!(err instanceof MetaApiError)) return "Couldn't reach Meta. Try again in a moment.";
  if (err.metaCode === 190) {
    return "Meta rejected the token (expired, revoked or not a System User token). Generate a new System User token with 'Never' expiry and save it again.";
  }
  if (err.metaCode === 10 || err.metaCode === 200 || err.metaCode === 299) {
    return "The token is missing a permission. When generating the System User token, tick both ads_read and business_management.";
  }
  if (err.metaCode === 100 || err.metaCode === 803) {
    return `Meta couldn't find that Business ID, or this token's business has no access to it. Check the ID in Business Settings → Business Info, and that the System User belongs to that business. (Meta said: ${err.metaMessage ?? "no details"})`;
  }
  return `Meta returned an error: ${err.metaMessage ?? "unknown"}`;
}

async function metaGet(path, token) {
  // Token goes in a header, not the URL, so it can't leak into logs/proxies.
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new MetaApiError(res.status, await res.json().catch(() => null));
  return res.json();
}

// Every ad account shared with the given Business Portfolio (via that
// business owner's own Business Settings -> Ad Accounts -> Partners flow).
// Each Roasify user supplies their own businessId + token -- there's no
// single shared Roasify business anymore.
//
// Lists both the business's own ad accounts and the ones clients shared with
// it. If only one of the two calls fails (e.g. no client accounts yet) we
// still return the other; if both fail the business ID/token is the problem.
export async function listClientAdAccounts(businessId, token) {
  const fields = "fields=id,name,currency&limit=100";
  const results = await Promise.allSettled([
    metaGet(`${businessId}/owned_ad_accounts?${fields}`, token),
    metaGet(`${businessId}/client_ad_accounts?${fields}`, token),
  ]);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  if (fulfilled.length === 0) throw results[0].reason;

  const byId = new Map();
  for (const r of fulfilled) {
    for (const acct of r.value.data || []) byId.set(acct.id, acct);
  }
  return [...byId.values()];
}

const MAX_INSIGHT_PAGES = 20;

// Per-product spend/CTR/CPM for one ad account between two dates. The
// product_id breakdown only returns data for catalog (dynamic product) ads.
export async function fetchMetaProductInsights(accountId, token, { since, until }) {
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  const base =
    `${accountId}/insights?level=account&breakdowns=product_id` +
    `&fields=product_id,spend,ctr,cpm&time_range=${timeRange}&limit=500`;

  const acct = await metaGet(`${accountId}?fields=currency`, token);
  const rows = [];
  let after = null;
  for (let page = 0; page < MAX_INSIGHT_PAGES; page++) {
    const data = await metaGet(after ? `${base}&after=${encodeURIComponent(after)}` : base, token);
    rows.push(...(data.data || []));
    after = data.paging?.next ? data.paging?.cursors?.after : null;
    if (!after) break;
  }
  return { rows, currency: acct.currency ?? null };
}

export async function fetchAdAccountInsights(accountId, token) {
  const acctData = await metaGet(`${accountId}?fields=name,currency`, token);
  let spend = 0,
    impressions = 0,
    clicks = 0,
    ctr = 0;
  try {
    const insights = await metaGet(`${accountId}/insights?fields=spend,impressions,clicks,ctr&date_preset=last_30d`, token);
    const row = insights.data?.[0] || {};
    spend = parseFloat(row.spend || 0);
    impressions = parseInt(row.impressions || 0, 10);
    clicks = parseInt(row.clicks || 0, 10);
    ctr = parseFloat(row.ctr || 0);
  } catch (err) {
    console.error(`[meta system user] insights failed for ${accountId}:`, err.message);
  }
  return { id: accountId, name: acctData.name, currency: acctData.currency, spend, impressions, clicks, ctr };
}
