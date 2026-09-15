import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addConnection } from "@/lib/connections";
import { verifyShopifyHmac, isValidShopDomain } from "@/lib/shopifyHmac";
import { verifyToken } from "@/lib/crypto";
import { exchangeMetaCode, getLongLivedMetaToken } from "@/lib/metaOAuth";
import { fetchMetaAdAccounts } from "@/lib/metaApi";
import { exchangeGoogleCode } from "@/lib/googleAdsOAuth";
import { listAccessibleCustomers } from "@/lib/googleAdsApi";

// Where each platform redirects back to after the user approves access.
// All three platforms are fully implemented below.
export async function GET(request, { params }) {
  const { platform } = params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(`${origin}/login`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard/connections/${platform}?error=not-configured`);
  }

  if (platform === "shopify") {
    return handleShopifyCallback({ searchParams, origin, code, session });
  }

  if (platform === "meta") {
    return handleMetaCallback({ searchParams, origin, code, session });
  }

  if (platform === "google") {
    return handleGoogleCallback({ searchParams, origin, code, session });
  }

  return NextResponse.json({ error: "Unknown platform" }, { status: 404 });
}

async function handleGoogleCallback({ searchParams, origin, code, session }) {
  const backToConnectPage = (error) =>
    NextResponse.redirect(`${origin}/dashboard/connections/google?error=${error}`);

  const state = searchParams.get("state");
  const stateData = await verifyToken(state);
  if (!stateData || stateData.email !== session.email || Date.now() > stateData.exp) {
    return backToConnectPage("invalid-request");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;

  let accessToken, refreshToken;
  try {
    const result = await exchangeGoogleCode(code, site);
    accessToken = result.accessToken;
    refreshToken = result.refreshToken;
  } catch (err) {
    console.error("[google callback] token exchange failed:", err.message);
    return backToConnectPage("token-exchange-failed");
  }

  if (!refreshToken) {
    // Happens if the user had already granted consent before and Google
    // skipped re-issuing a refresh_token despite prompt=consent -- ask them
    // to revoke access at myaccount.google.com/permissions and reconnect.
    console.error("[google callback] no refresh_token returned");
    return backToConnectPage("no-refresh-token");
  }

  let customerIds;
  try {
    customerIds = await listAccessibleCustomers(accessToken);
  } catch (err) {
    console.error("[google callback] listing accounts failed:", err.message);
    return backToConnectPage("token-exchange-failed");
  }

  if (customerIds.length === 0) {
    return backToConnectPage("no-ad-accounts");
  }

  try {
    for (const customerId of customerIds) {
      await addConnection({
        userEmail: session.email,
        platform: "google",
        label: `Google Ads (${customerId})`,
        accessToken,
        refreshToken,
        meta: { customerId },
      });
    }
  } catch (err) {
    console.error("[google callback] failed to save connection:", err.message);
    return backToConnectPage("save-failed");
  }

  return NextResponse.redirect(`${origin}/dashboard/connections?connected=google`);
}

async function handleMetaCallback({ searchParams, origin, code, session }) {
  const backToConnectPage = (error) =>
    NextResponse.redirect(`${origin}/dashboard/connections/meta?error=${error}`);

  const state = searchParams.get("state");
  const stateData = await verifyToken(state);
  if (!stateData || stateData.email !== session.email || Date.now() > stateData.exp) {
    return backToConnectPage("invalid-request");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;

  let accessToken;
  try {
    const shortLived = await exchangeMetaCode(code, site);
    accessToken = await getLongLivedMetaToken(shortLived);
  } catch (err) {
    console.error("[meta callback] token exchange failed:", err.message);
    return backToConnectPage("token-exchange-failed");
  }

  let accounts;
  try {
    accounts = await fetchMetaAdAccounts(accessToken);
  } catch (err) {
    console.error("[meta callback] fetching ad accounts failed:", err.message);
    return backToConnectPage("token-exchange-failed");
  }

  if (accounts.length === 0) {
    return backToConnectPage("no-ad-accounts");
  }

  // Meta's OAuth grants access to every ad account the user approved in one
  // shot -- save each as its own connection, same as how a Shopify
  // connection is one store each.
  try {
    for (const acct of accounts) {
      await addConnection({
        userEmail: session.email,
        platform: "meta",
        label: `${acct.name} (${acct.id})`,
        accessToken,
        meta: { adAccountId: acct.id, currency: acct.currency },
      });
    }
  } catch (err) {
    console.error("[meta callback] failed to save connection:", err.message);
    return backToConnectPage("save-failed");
  }

  return NextResponse.redirect(`${origin}/dashboard/connections?connected=meta`);
}

async function handleShopifyCallback({ searchParams, origin, code, session }) {
  const shop = searchParams.get("shop");
  const backToConnectPage = (error) =>
    NextResponse.redirect(`${origin}/dashboard/connections/shopify?error=${error}`);

  if (!shop || !isValidShopDomain(shop)) {
    return backToConnectPage("missing-shop");
  }

  // Confirms this callback genuinely came from Shopify, not a forged
  // request hitting this URL directly with someone else's shop/code.
  const verified = await verifyShopifyHmac(searchParams);
  if (!verified) {
    return backToConnectPage("invalid-request");
  }

  let accessToken;
  let grantedScope;
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error(`[shopify callback] token exchange failed (${tokenRes.status}):`, detail);
      return backToConnectPage("token-exchange-failed");
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
    grantedScope = tokenData.scope;
    if (!accessToken) {
      console.error("[shopify callback] no access_token in response:", tokenData);
      return backToConnectPage("token-exchange-failed");
    }
  } catch (err) {
    console.error("[shopify callback] token exchange request failed:", err.message);
    return backToConnectPage("token-exchange-failed");
  }

  try {
    await addConnection({
      userEmail: session.email,
      platform: "shopify",
      label: shop,
      accessToken,
      meta: { scope: grantedScope },
    });
  } catch (err) {
    console.error("[shopify callback] failed to save connection:", err.message);
    return backToConnectPage("save-failed");
  }

  return NextResponse.redirect(`${origin}/dashboard/connections?connected=shopify`);
}
