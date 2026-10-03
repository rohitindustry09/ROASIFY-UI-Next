import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isValidShopDomain } from "@/lib/shopifyHmac";
import { buildShopifyAuthorizeUrl, signShopifyState } from "@/lib/shopifyOAuth";
import { saveShopifyAppCredentials } from "@/lib/shopifyAppCredentials";

const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_SECRET_LENGTH = 256;

// Starts a Shopify connection using the store owner's OWN Shopify app. The
// secret arrives in a POST body (never a URL), is stored encrypted only until
// the OAuth callback finishes, and the browser is then sent to Shopify.
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const shopInput = String(body?.shop ?? "").trim().toLowerCase();
  const shop = shopInput.includes(".") ? shopInput : `${shopInput}.myshopify.com`;
  const clientId = String(body?.clientId ?? "").trim();
  const clientSecret = String(body?.clientSecret ?? "").trim();

  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "Enter your store's .myshopify.com domain." }, { status: 400 });
  }
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    return NextResponse.json({ error: "That Client ID doesn't look right." }, { status: 400 });
  }
  if (!clientSecret || clientSecret.length > MAX_SECRET_LENGTH) {
    return NextResponse.json({ error: "Enter the app's Client secret." }, { status: 400 });
  }

  try {
    await saveShopifyAppCredentials(session.email, shop, clientId, clientSecret);
  } catch (err) {
    console.error("[shopify custom] failed to save credentials:", err.message);
    return NextResponse.json({ error: "Couldn't save those credentials. Try again." }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const state = await signShopifyState({ shop, email: session.email });
  return NextResponse.json({ ok: true, redirectUrl: buildShopifyAuthorizeUrl(shop, site, state, clientId) });
}
