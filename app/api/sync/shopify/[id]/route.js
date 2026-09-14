import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getConnectionTokens } from "@/lib/connections";
import { fetchShopifyOverview } from "@/lib/shopifyApi";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let connection;
  try {
    connection = await getConnectionTokens(params.id, session.email);
  } catch (err) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  if (connection.platform !== "shopify") {
    return NextResponse.json({ error: "Not a Shopify connection." }, { status: 400 });
  }

  try {
    const overview = await fetchShopifyOverview(connection.label, connection.accessToken);
    return NextResponse.json({ shop: connection.label, ...overview });
  } catch (err) {
    console.error("[sync/shopify] fetch failed:", err.message);
    return NextResponse.json({ error: "Couldn't fetch data from Shopify. The token may have expired or been revoked." }, { status: 502 });
  }
}
