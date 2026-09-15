import { refreshGoogleAccessToken } from "@/lib/googleAdsOAuth";

const API_VERSION = "v25"; // current stable as of mid-2026, supported through Aug 2027

function devTokenHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    "Content-Type": "application/json",
  };
}

export async function listAccessibleCustomers(accessToken) {
  const res = await fetch(`https://googleads.googleapis.com/${API_VERSION}/customers:listAccessibleCustomers`, {
    headers: devTokenHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`listAccessibleCustomers failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  // Each entry looks like "customers/1234567890" -- strip to the bare ID.
  return (data.resourceNames || []).map((rn) => rn.split("/")[1]);
}

const CAMPAIGN_METRICS_QUERY = `
  SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    metrics.cost_micros,
    metrics.clicks,
    metrics.impressions,
    metrics.conversions
  FROM campaign
  WHERE segments.date DURING LAST_30_DAYS
`;

async function fetchCampaignsForCustomer(customerId, accessToken) {
  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: devTokenHeaders(accessToken),
      body: JSON.stringify({ query: CAMPAIGN_METRICS_QUERY }),
    }
  );
  if (!res.ok) throw new Error(`searchStream failed for ${customerId} (${res.status}): ${await res.text()}`);
  const chunks = await res.json(); // streaming endpoint returns an array of result batches
  const rows = [];
  for (const chunk of chunks) {
    for (const r of chunk.results || []) {
      rows.push({
        campaignId: r.campaign.id,
        name: r.campaign.name,
        status: r.campaign.status,
        cost: Number(r.metrics.costMicros || 0) / 1_000_000,
        clicks: Number(r.metrics.clicks || 0),
        impressions: Number(r.metrics.impressions || 0),
        conversions: Number(r.metrics.conversions || 0),
      });
    }
  }
  return rows;
}

// Access tokens expire in ~1 hour, so every real fetch refreshes from the
// stored refresh_token first rather than trusting a possibly-stale access
// token from whenever the connection was first made.
export async function fetchGoogleAdsOverview(refreshToken, customerId) {
  const accessToken = await refreshGoogleAccessToken(refreshToken);
  const campaigns = await fetchCampaignsForCustomer(customerId, accessToken);
  const totals = campaigns.reduce(
    (acc, c) => ({
      cost: acc.cost + c.cost,
      clicks: acc.clicks + c.clicks,
      impressions: acc.impressions + c.impressions,
      conversions: acc.conversions + c.conversions,
    }),
    { cost: 0, clicks: 0, impressions: 0, conversions: 0 }
  );
  return { campaigns, totals };
}
