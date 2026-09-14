import { NextResponse } from "next/server";
import { verifyShopifyHmac, isValidShopDomain } from "@/lib/shopifyHmac";
import { buildShopifyAuthorizeUrl } from "@/lib/shopifyOAuth";

// This is the route to set as your app's "App URL" in the Shopify Partner
// Dashboard. When a merchant installs your app from inside their own
// Shopify admin (via the App Store, or a direct link Shopify generates),
// Shopify redirects their browser here WITH the shop already known --
// nobody types a domain. This only fires when the merchant-initiated
// install actually happens; a plain visit to this URL without Shopify's
// signature is rejected below.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const shop = searchParams.get("shop");

  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.redirect(`${origin}/dashboard/connections/shopify?error=missing-shop`);
  }

  if (!process.env.SHOPIFY_API_KEY) {
    return NextResponse.redirect(`${origin}/dashboard/connections/shopify?error=not-configured`);
  }

  // Confirms this request really came from Shopify and wasn't just someone
  // visiting this URL with a made-up ?shop= value.
  const verified = await verifyShopifyHmac(searchParams);
  if (!verified) {
    return NextResponse.redirect(`${origin}/dashboard/connections/shopify?error=invalid-request`);
  }

  return NextResponse.redirect(buildShopifyAuthorizeUrl(shop, site));
}
