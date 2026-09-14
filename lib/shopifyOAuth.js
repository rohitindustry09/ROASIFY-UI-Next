export function buildShopifyAuthorizeUrl(shop, site) {
  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=read_orders,read_products` +
    `&redirect_uri=${encodeURIComponent(`${site}/api/connect/shopify/callback`)}`
  );
}
