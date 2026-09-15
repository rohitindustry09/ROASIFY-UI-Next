import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getConnectionTokens } from "@/lib/connections";
import { fetchGoogleAdsOverview } from "@/lib/googleAdsApi";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let connection;
  try {
    connection = await getConnectionTokens(params.id, session.email);
  } catch {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  if (connection.platform !== "google") {
    return NextResponse.json({ error: "Not a Google Ads connection." }, { status: 400 });
  }

  if (!connection.refreshToken) {
    return NextResponse.json({ error: "This connection has no refresh token saved — reconnect it." }, { status: 400 });
  }

  const customerId = connection.meta?.customerId;
  if (!customerId) {
    return NextResponse.json({ error: "Couldn't determine which Google Ads account this is." }, { status: 400 });
  }

  try {
    const overview = await fetchGoogleAdsOverview(connection.refreshToken, customerId);
    return NextResponse.json({ label: connection.label, ...overview });
  } catch (err) {
    console.error("[sync/google] fetch failed:", err.message);
    return NextResponse.json(
      { error: "Couldn't fetch data from Google Ads. The token may have expired, or your developer token may not have Basic access yet." },
      { status: 502 }
    );
  }
}
