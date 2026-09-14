const API_VERSION = "v26.0"; // Meta's current stable Graph/Marketing API version as of mid-2026

export function buildMetaAuthorizeUrl(site, state) {
  return (
    `https://www.facebook.com/${API_VERSION}/dialog/oauth` +
    `?client_id=${process.env.META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(`${site}/api/connect/meta/callback`)}` +
    `&scope=ads_read` +
    `&state=${encodeURIComponent(state)}`
  );
}

export async function exchangeMetaCode(code, site) {
  const url =
    `https://graph.facebook.com/${API_VERSION}/oauth/access_token` +
    `?client_id=${process.env.META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&redirect_uri=${encodeURIComponent(`${site}/api/connect/meta/callback`)}` +
    `&code=${code}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meta token exchange failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) throw new Error(`No access_token in Meta response: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Short-lived tokens from the initial exchange last ~1-2 hours. Meta lets
// you trade one in for a long-lived token (~60 days) in a second call --
// worth doing immediately so the connection doesn't die within the hour.
export async function getLongLivedMetaToken(shortLivedToken) {
  const url =
    `https://graph.facebook.com/${API_VERSION}/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${process.env.META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&fb_exchange_token=${shortLivedToken}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meta long-lived token exchange failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.access_token || shortLivedToken; // fall back to short-lived if this step fails
}

export { API_VERSION as META_API_VERSION };
