import { NextResponse } from "next/server";
import { buildShopifyAuthorizeUrl } from "@/lib/shopifyOAuth";
import { buildMetaAuthorizeUrl } from "@/lib/metaOAuth";
import { buildGoogleAuthorizeUrl } from "@/lib/googleAdsOAuth";
import { getSession } from "@/lib/session";
import { signToken } from "@/lib/crypto";

// This route performs the actual OAuth redirect. It's hit by the form on
// /dashboard/connections/[platform] — not called directly by the UI.
//
// Why the app-level env vars (META_APP_ID, GOOGLE_ADS_CLIENT_ID, etc.) still
// exist even though *users* connect their own accounts dynamically: OAuth
// always needs two identities, not one. The user's account is dynamic — any
// shop, any ad account, decided at click time. But the *app itself* also
// has to identify itself to Meta/Google/Shopify as a registered application,
// and that identity (client ID + secret) is issued once when you register
// a developer app, and stays the same no matter how many users connect
// through it. It's the same pattern as "Sign in with Google" on any
// website: the site has one Google Client ID, but any of Google's billions
// of users can sign in through it. These are that ID, for three platforms.
function envConfigured(platform) {
  if (platform === "shopify") return Boolean(process.env.SHOPIFY_API_KEY);
  if (platform === "meta") return Boolean(process.env.META_APP_ID);
  if (platform === "google") return Boolean(process.env.GOOGLE_ADS_CLIENT_ID);
  return false;
}

export async function GET(request, { params }) {
  const { platform } = params;
  const { origin, searchParams } = new URL(request.url);
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;

  const backToConnectPage = (error) =>
    NextResponse.redirect(`${origin}/dashboard/connections/${platform}?error=${error}`);

  if (!["shopify", "meta", "google"].includes(platform)) {
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

  if (platform === "meta") {
    const session = await getSession();
    if (!session) return NextResponse.redirect(`${origin}/login`);
    // Signed, short-lived state token -- the callback checks this came
    // from the same signed-in user and hasn't been replayed later, since
    // Meta (unlike Shopify) doesn't sign its callback requests itself.
    const state = await signToken({ email: session.email, exp: Date.now() + 10 * 60 * 1000 });
    return NextResponse.redirect(buildMetaAuthorizeUrl(site, state));
  }

  if (platform === "google") {
    const session = await getSession();
    if (!session) return NextResponse.redirect(`${origin}/login`);
    const state = await signToken({ email: session.email, exp: Date.now() + 10 * 60 * 1000 });
    return NextResponse.redirect(buildGoogleAuthorizeUrl(site, state));
  }
}
