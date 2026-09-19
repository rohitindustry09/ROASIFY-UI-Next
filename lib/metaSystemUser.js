const API_VERSION = "v26.0";

async function metaGet(path, token) {
  const url = `https://graph.facebook.com/${API_VERSION}/${path}${path.includes("?") ? "&" : "?"}access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meta API request failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// Every ad account shared with the given Business Portfolio (via that
// business owner's own Business Settings -> Ad Accounts -> Partners flow).
// Each Roasify user supplies their own businessId + token -- there's no
// single shared Roasify business anymore.
export async function listClientAdAccounts(businessId, token) {
  const data = await metaGet(`${businessId}/client_ad_accounts?fields=id,name,currency`, token);
  return data.data || [];
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
