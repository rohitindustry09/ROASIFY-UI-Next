import { NextResponse } from "next/server";
import { buildShopifyAuthorizeUrl } from "@/lib/shopifyOAuth";
import { buildGoogleAuthorizeUrl } from "@/lib/googleAdsOAuth";
import { getSession } from "@/lib/session";
import { signToken } from "@/lib/crypto";

// This route performs the actual OAuth redirect for Shopify and Google.
// Meta no longer uses this path -- it switched to a System User + Business
// Portfolio "share your account" model instead of per-user OAuth (see
// lib/metaSystemUser.js and components/MetaClaimFlow.jsx). Kept here so a
// direct hit on /api/connect/meta still resolves to something sensible
// rather than 404ing, in case an old link is still floating around.
//
// Why the app-level env vars (GOOGLE_ADS_CLIENT_ID, etc.) still exist even
// though *users* connect their own accounts dynamically: OAuth always
// needs two identities, not one. The user's account is dynamic -- any
// shop, any ad account, decided at click time. But the *app itself* also
// has to identify itself to Google/Shopify as a registered application,
// and that identity (client ID + secret) is issued once when you register
// a developer app, and stays the same no matter how many users connect
// through it.
function envConfigured(platform) {
  if (platform === "shopify") return Boolean(process.env.SHOPIFY_API_KEY);
  if (platform === "google") return Boolean(process.env.GOOGLE_ADS_CLIENT_ID);
  return false;
}

export async function GET(request, { params }) {
  const { platform } = params;
  const { origin, searchParams } = new URL(request.url);
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;

  const backToConnectPage = (error) =>
    NextResponse.redirect(`${origin}/dashboard/connections/${platform}?error=${error}`);

  if (platform === "meta") {
    return NextResponse.redirect(`${origin}/dashboard/connections/meta`);
  }

  if (!["shopify", "google"].includes(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 404 });
  }

  if (!envConfigured(platform)) {
    return backToConnectPage("not-configured");
  }

  if (platform === "shopify") {
    const shopInput = searchParams.get("shop")?.trim();
    if (!shopInput) return backToConnectPage("missing-shop");
    const shop = shopInput.includes(".") ? shopInput : `${shopInput}.myshopify.com`;
    return NextResponse.redirect(buildShopifyAuthorizeUrl(shop, site));
  }

  if (platform === "google") {
    const session = await getSession();
    if (!session) return NextResponse.redirect(`${origin}/login`);
    const state = await signToken({ email: session.email, exp: Date.now() + 10 * 60 * 1000 });
    return NextResponse.redirect(buildGoogleAuthorizeUrl(site, state));
  }
}
