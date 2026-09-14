import { META_API_VERSION } from "@/lib/metaOAuth";

async function metaGet(path, accessToken) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/${path}${path.includes("?") ? "&" : "?"}access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API request failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function fetchMetaAdAccounts(accessToken) {
  const data = await metaGet("me/adaccounts?fields=id,name,currency,account_status", accessToken);
  return data.data || [];
}

export async function fetchMetaOverview(accessToken) {
  const accounts = await fetchMetaAdAccounts(accessToken);

  const withInsights = await Promise.all(
    accounts.map(async (acct) => {
      try {
        const insights = await metaGet(
          `${acct.id}/insights?fields=spend,impressions,clicks,ctr&date_preset=last_30d`,
          accessToken
        );
        const row = insights.data?.[0] || {};
        return {
          id: acct.id,
          name: acct.name,
          currency: acct.currency,
          active: acct.account_status === 1,
          spend: parseFloat(row.spend || 0),
          impressions: parseInt(row.impressions || 0, 10),
          clicks: parseInt(row.clicks || 0, 10),
          ctr: parseFloat(row.ctr || 0),
        };
      } catch (err) {
        // One ad account failing insights shouldn't blank out the rest.
        console.error(`[meta] insights failed for ${acct.id}:`, err.message);
        return { id: acct.id, name: acct.name, currency: acct.currency, active: false, spend: 0, impressions: 0, clicks: 0, ctr: 0, error: true };
      }
    })
  );

  return { accounts: withInsights };
}
