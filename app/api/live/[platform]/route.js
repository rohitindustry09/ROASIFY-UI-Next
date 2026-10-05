import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getConnectionTokens } from "@/lib/connections";
import { fetchShopifyLineItems } from "@/lib/shopifyApi";
import { fetchMetaProductInsights, describeMetaError } from "@/lib/metaSystemUser";
import { fetchGoogleProductPerformance, describeGoogleAdsError } from "@/lib/googleAdsApi";
import {
  SUPPORTED_DAY_RANGES,
  dateRange,
  shopifyOrdersToRows,
  metaInsightsToRows,
  googleResultsToRows,
} from "@/lib/liveRows";

export const maxDuration = 60; // a busy Shopify store can take many paged requests

const MAX_ACCOUNTS = 20;

// One account's rows in the same column format as an uploaded export.
const FETCHERS = {
  async shopify(connection, range) {
    const { orders, truncated, currency } = await fetchShopifyLineItems(connection.label, connection.accessToken, range.since);
    return { rows: shopifyOrdersToRows(orders), currency, note: truncated ? "partial" : null, detail: `${orders.length} orders found in this period` };
  },
  async meta(connection, range) {
    const accountId = connection.meta?.adAccountId;
    if (!accountId) throw new Error("This connection has no ad account id.");
    const { rows, currency } = await fetchMetaProductInsights(accountId, connection.accessToken, range);
    const mapped = metaInsightsToRows(rows, range.month);
    return { rows: mapped, currency, note: null, detail: `Meta returned ${rows.length} product rows (${mapped.length} usable). Product-level data needs catalog / dynamic product ads.` };
  },
  async google(connection, range) {
    const customerId = connection.meta?.customerId;
    if (!customerId || !connection.refreshToken) throw new Error("This connection needs to be reconnected.");
    const results = await fetchGoogleProductPerformance(connection.refreshToken, customerId, range);
    const mapped = googleResultsToRows(results, range.month);
    return { rows: mapped, currency: null, note: null, detail: `Google returned ${results.length} product rows (${mapped.length} usable). Product-level data needs Shopping campaigns.` };
  },
};

function friendlyError(platform, err) {
  if (platform === "meta") return describeMetaError(err);
  if (platform === "google") return describeGoogleAdsError(err);
  return "Couldn't fetch data from Shopify. The token may have expired or been revoked.";
}

// Body: { ids: [connectionId, ...], days: 7 | 30 | 90 }
export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const fetcher = FETCHERS[params.platform];
  if (!fetcher) return NextResponse.json({ error: "Unknown platform." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.map(String))] : [];
  const days = Number(body?.days);
  if (ids.length === 0 || ids.length > MAX_ACCOUNTS) {
    return NextResponse.json({ error: "Choose at least one account." }, { status: 400 });
  }
  if (!SUPPORTED_DAY_RANGES.includes(days)) {
    return NextResponse.json({ error: "Unsupported date range." }, { status: 400 });
  }

  const range = dateRange(days);
  const settled = await Promise.all(
    ids.map(async (id) => {
      let label = id;
      try {
        // Scoped to the signed-in user, so another user's connection id just 404s.
        const connection = await getConnectionTokens(id, session.email);
        label = connection.label;
        if (connection.platform !== params.platform) throw new Error("Wrong platform.");
        const result = await fetcher(connection, range);
        return { id, label, ok: true, ...result };
      } catch (err) {
        console.error(`[live ${params.platform}] ${id} failed:`, err.message);
        return { id, label, ok: false, error: friendlyError(params.platform, err) };
      }
    })
  );

  const succeeded = settled.filter((s) => s.ok);
  return NextResponse.json({
    range,
    rows: succeeded.flatMap((s) => s.rows),
    currencies: [...new Set(succeeded.map((s) => s.currency).filter(Boolean))],
    partial: succeeded.some((s) => s.note === "partial"),
    accounts: settled.map(({ id, label, ok, error, rows, detail }) => ({ id, label, ok, error, detail, rowCount: rows?.length })),
  });
}
