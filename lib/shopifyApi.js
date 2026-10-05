// Shopify made GraphQL the required Admin API for any app created after
// April 1, 2025 -- REST's /products endpoint in particular is deprecated
// for new custom apps. This app was created in 2026, so GraphQL only.
const API_VERSION = "2026-07";

// Turns a Shopify failure into advice the user can act on.
export function describeShopifyError(err) {
  const text = String(err?.message ?? "");
  const snippet = text.replace(/^Shopify GraphQL (request failed|errors):?\s*/i, "").slice(0, 200);
  if (text.includes("(401)")) {
    return "Shopify rejected the token (revoked, or the app was uninstalled or reinstalled). Disconnect this store and connect it again.";
  }
  if (text.includes("(402)") || text.includes("(423)")) {
    return "This Shopify store is unavailable (frozen, or its plan is unpaid).";
  }
  if (text.includes("(403)") || /ACCESS_DENIED|access denied|scope/i.test(text)) {
    return `The Shopify app is missing a permission. Make sure its scopes are read_orders and read_products, then reinstall it. (Shopify said: ${snippet})`;
  }
  if (text.includes("(404)")) {
    return "Shopify couldn't find that store or API version. Check the store domain, then reconnect.";
  }
  if (text.includes("(429)") || /THROTTLED/i.test(text)) {
    return "Shopify is rate-limiting requests. Wait a minute and try again.";
  }
  return `Couldn't fetch data from Shopify. (Shopify said: ${snippet || "no details"})`;
}

export async function shopifyGraphQL(shop, accessToken, query, variables = {}) {
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

const LINE_ITEMS_QUERY = `
  query LineItems($first: Int!, $after: String, $query: String!) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          createdAt
          cancelledAt
          lineItems(first: 10) {
            pageInfo { hasNextPage }
            edges {
              node {
                title
                variantTitle
                quantity
                currentQuantity
                variant { id }
                discountedTotalSet { shopMoney { amount currencyCode } }
              }
            }
          }
        }
      }
    }
  }
`;

const ORDERS_PER_PAGE = 50;
const MAX_ORDER_PAGES = 20; // up to 1,000 orders per fetch

// Orders (with their line items) created since `since` (YYYY-MM-DD), skipping
// cancelled ones. `truncated` is true when we hit the page cap or an order
// had more than 10 lines, so the caller can tell the user figures are partial.
export async function fetchShopifyLineItems(shop, accessToken, since) {
  const orders = [];
  let after = null;
  let truncated = false;
  let currency = null;

  for (let page = 0; page < MAX_ORDER_PAGES; page++) {
    const data = await shopifyGraphQL(shop, accessToken, LINE_ITEMS_QUERY, {
      first: ORDERS_PER_PAGE,
      after,
      query: `created_at:>=${since}`,
    });
    for (const { node } of data.orders.edges) {
      if (node.cancelledAt) continue;
      if (node.lineItems.pageInfo.hasNextPage) truncated = true;
      orders.push({
        createdAt: node.createdAt,
        lineItems: node.lineItems.edges.map(({ node: li }) => {
          currency = currency || li.discountedTotalSet.shopMoney.currencyCode;
          return {
            title: li.title,
            variantTitle: li.variantTitle,
            quantity: li.quantity,
            currentQuantity: li.currentQuantity,
            variantId: li.variant?.id ?? null,
            amount: li.discountedTotalSet.shopMoney.amount,
          };
        }),
      });
    }
    if (!data.orders.pageInfo.hasNextPage) return { orders, truncated, currency };
    after = data.orders.pageInfo.endCursor;
  }
  return { orders, truncated: true, currency };
}
