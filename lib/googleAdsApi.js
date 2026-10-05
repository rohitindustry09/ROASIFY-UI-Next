import { refreshGoogleAccessToken } from "@/lib/googleAdsOAuth";

const API_VERSION = "v25"; // current stable as of mid-2026, supported through Aug 2027

// Keeps Google's response body so callers can explain what actually went wrong.
export class GoogleAdsError extends Error {
  constructor(label, status, bodyText) {
    super(`${label} (${status}): ${bodyText}`);
    this.status = status;
    this.bodyText = bodyText;
  }
}

// Turns a Google Ads / OAuth failure into advice the user can act on.
export function describeGoogleAdsError(err) {
  const text = err instanceof GoogleAdsError || err instanceof Error ? err.message : "";
  if (text.includes("invalid_grant")) {
    return "Google revoked or expired this connection (apps in Testing mode lose access after 7 days). Disconnect it and connect again.";
  }
  if (text.includes("DEVELOPER_TOKEN_NOT_APPROVED") || text.includes("DEVELOPER_TOKEN_PROHIBITED")) {
    return "Your Google Ads developer token only has Test access, so it can't read real accounts yet. Apply for Basic access in the Google Ads API Center.";
  }
  if (text.includes("DEVELOPER_TOKEN_INVALID") || text.includes("developer-token")) {
    return "The developer token is missing or invalid. Check GOOGLE_ADS_DEVELOPER_TOKEN in Vercel.";
  }
  if (text.includes("REQUESTED_METRICS_FOR_MANAGER")) {
    return "That is a manager (MCC) account, which has no campaign data of its own. Connect one of the ad accounts under it instead.";
  }
  if (text.includes("USER_PERMISSION_DENIED") || text.includes("CUSTOMER_NOT_ENABLED")) {
    return "This Google login can't read that ad account (no access, or the account is cancelled). Check the account and your access to it.";
  }
  if (text.includes("SERVICE_DISABLED") || text.includes("has not been used in project")) {
    return "The Google Ads API isn't enabled in your Google Cloud project. Enable it under APIs & Services → Library.";
  }
  if (text.includes("(404)")) {
    return "Google Ads returned 'not found'. The API version Roasify uses may be retired; this needs a code update.";
  }
  return "Couldn't fetch data from Google Ads. See the Vercel Functions logs for the exact reason.";
}

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
  if (!res.ok) throw new GoogleAdsError("listAccessibleCustomers failed", res.status, await res.text());
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
  if (!res.ok) throw new GoogleAdsError(`searchStream failed for ${customerId}`, res.status, await res.text());
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
