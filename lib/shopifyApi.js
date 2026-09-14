// Shopify made GraphQL the required Admin API for any app created after
// April 1, 2025 -- REST's /products endpoint in particular is deprecated
// for new custom apps. This app was created in 2026, so GraphQL only.
const API_VERSION = "2026-07";

async function shopifyGraphQL(shop, accessToken, query, variables = {}) {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify GraphQL request failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

const RECENT_DATA_QUERY = `
  query RecentData($first: Int!) {
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          status
          totalInventory
        }
      }
    }
    productsCount { count }
    orders(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          totalPriceSet { shopMoney { amount currencyCode } }
        }
      }
    }
    ordersCount { count }
  }
`;

export async function fetchShopifyOverview(shop, accessToken, first = 10) {
  const data = await shopifyGraphQL(shop, accessToken, RECENT_DATA_QUERY, { first });

  const products = data.products.edges.map((e) => e.node);
  const orders = data.orders.edges.map((e) => ({
    id: e.node.id,
    name: e.node.name,
    createdAt: e.node.createdAt,
    status: e.node.displayFinancialStatus,
    total: parseFloat(e.node.totalPriceSet.shopMoney.amount),
    currency: e.node.totalPriceSet.shopMoney.currencyCode,
  }));

  // This total is only over the `first` most recent orders fetched above,
  // not the whole shop's history -- a real sync job would paginate through
  // everything. ordersCount.count below is the true total order count.
  const recentRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return {
    productCount: data.productsCount.count,
    orderCount: data.ordersCount.count,
    products,
    orders,
    recentRevenue,
    currency: orders[0]?.currency || "USD",
  };
}
