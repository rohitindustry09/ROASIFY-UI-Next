export function buildGoogleAuthorizeUrl(site, state) {
  return (
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${process.env.GOOGLE_ADS_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(`${site}/api/connect/google/callback`)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("https://www.googleapis.com/auth/adwords")}` +
    `&access_type=offline` + // needed to get a refresh_token back, not just a short-lived access token
    `&prompt=consent` + // forces Google to re-issue a refresh_token even if the user connected before
    `&state=${encodeURIComponent(state)}`
  );
}

export async function exchangeGoogleCode(code, site) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      redirect_uri: `${site}/api/connect/google/callback`,
    }),
  });

  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) throw new Error(`No access_token in Google response: ${JSON.stringify(data)}`);
  // refresh_token is what makes the connection durable -- access_token alone
  // expires in about an hour. Only present if access_type=offline and
  // prompt=consent were both set on the authorize URL (they are, above).
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function refreshGoogleAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}
