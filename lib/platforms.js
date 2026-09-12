export const PLATFORMS = {
  shopify: {
    key: "shopify",
    name: "Shopify",
    description: "Reads orders, revenue, and product variants.",
    needsShopDomain: true,
  },
  meta: {
    key: "meta",
    name: "Meta ads",
    description: "Reads spend, impressions, and CTR per product ad.",
    needsShopDomain: false,
  },
  google: {
    key: "google",
    name: "Google ads",
    description: "Reads cost and conversions per item ID.",
    needsShopDomain: false,
  },
};

export function getPlatform(key) {
  return PLATFORMS[key] ?? null;
}
