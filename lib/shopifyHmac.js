// Shopify signs every request it sends to your app's configured "App URL"
// with an HMAC over the query string, so you can trust `shop` actually came
// from Shopify and wasn't just typed into the URL by anyone. Algorithm per
// https://shopify.dev/docs/apps/build/authentication-authorization/oauth-admin/get-access-tokens

function hex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyShopifyHmac(searchParams) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const pairs = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const computed = hex(new Uint8Array(sigBuf));

  // Timing-safe comparison
  if (computed.length !== hmac.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hmac.charCodeAt(i);
  return diff === 0;
}

export function isValidShopDomain(shop) {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}
