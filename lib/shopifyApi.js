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

const LAST_30_DAYS_QUERY = `
  query Orders30($first: Int!, $after: String, $query: String!) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          cancelledAt
          currentTotalPriceSet { shopMoney { amount currencyCode } }
        }
      }
    }
  }
`;

const ORDERS_PAGE_SIZE = 250;
const MAX_ORDER_PAGES = 4; // up to 1,000 orders; beyond that the total is flagged as partial

// Net revenue (after refunds/edits, excluding cancelled orders) and order
// count for the last 30 days, to line up with the 30-day ad-spend windows.
export async function fetchShopifyLast30Days(shop, accessToken, now = new Date()) {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let after = null;
  let revenue = 0;
  let orders = 0;
  let currency = null;

  for (let page = 0; page < MAX_ORDER_PAGES; page++) {
    const data = await shopifyGraphQL(shop, accessToken, LAST_30_DAYS_QUERY, {
      first: ORDERS_PAGE_SIZE,
      after,
      query: `created_at:>=${since}`,
    });
    for (const { node } of data.orders.edges) {
      if (node.cancelledAt) continue;
      const money = node.currentTotalPriceSet.shopMoney;
      revenue += parseFloat(money.amount);
      currency = currency || money.currencyCode;
      orders += 1;
    }
    if (!data.orders.pageInfo.hasNextPage) return { revenue, orders, currency, truncated: false };
    after = data.orders.pageInfo.endCursor;
  }
  return { revenue, orders, currency, truncated: true };
}

export async function fetchShopifyOverview(shop, accessToken, first = 10) {
  const [data, last30d] = await Promise.all([
    shopifyGraphQL(shop, accessToken, RECENT_DATA_QUERY, { first }),
    fetchShopifyLast30Days(shop, accessToken).catch((err) => {
      console.error("[shopify] last-30-days fetch failed:", err.message);
      return null;
    }),
  ]);

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
    last30d,
    currency: orders[0]?.currency || last30d?.currency || "USD",
  };
}
