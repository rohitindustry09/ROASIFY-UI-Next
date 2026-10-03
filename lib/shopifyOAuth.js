import { signToken, verifyToken } from "@/lib/crypto";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const SHOPIFY_STATE_TYPE = "shopify-oauth-state";
const GOOGLE_STATE_TYPE = "google-oauth-state";

// `email` is the signed-in user the flow was started for (null when the
// merchant starts from inside their Shopify admin, before any Roasify login).
export function signShopifyState({ shop, email = null }) {
  return signToken({ shop, email, exp: Date.now() + OAUTH_STATE_TTL_MS }, SHOPIFY_STATE_TYPE);
}

export async function verifyShopifyState(state, { shop, email }) {
  const data = await verifyToken(state, SHOPIFY_STATE_TYPE);
  if (!data || Date.now() > data.exp || data.shop !== shop) return false;
  return data.email === null || data.email === email;
}

export function signGoogleState(email) {
  return signToken({ email, exp: Date.now() + OAUTH_STATE_TTL_MS }, GOOGLE_STATE_TYPE);
}

export async function verifyGoogleState(state, email) {
  const data = await verifyToken(state, GOOGLE_STATE_TYPE);
  return Boolean(data) && data.email === email && Date.now() <= data.exp;
}

export function buildShopifyAuthorizeUrl(shop, site, state) {
  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(process.env.SHOPIFY_API_KEY)}` +
    `&scope=read_orders,read_products` +
    `&redirect_uri=${encodeURIComponent(`${site}/api/connect/shopify/callback`)}` +
    `&state=${encodeURIComponent(state)}`
  );
}
