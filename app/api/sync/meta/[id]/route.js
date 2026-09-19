import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getConnectionTokens } from "@/lib/connections";
import { fetchAdAccountInsights } from "@/lib/metaSystemUser";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let connection;
  try {
    connection = await getConnectionTokens(params.id, session.email);
  } catch {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  if (connection.platform !== "meta") {
    return NextResponse.json({ error: "Not a Meta connection." }, { status: 400 });
  }

  const accountId = connection.meta?.adAccountId;
  if (!accountId) {
    return NextResponse.json({ error: "Couldn't determine which ad account this is." }, { status: 400 });
  }

  try {
    // Uses this connection's own stored token (each user's own System User
    // token, saved at claim time), not a global env var.
    const account = await fetchAdAccountInsights(accountId, connection.accessToken);
    return NextResponse.json({ accounts: [account] });
  } catch (err) {
    console.error("[sync/meta] fetch failed:", err.message);
    return NextResponse.json(
      { error: "Couldn't fetch data from Meta. The account may no longer be shared with Roasify." },
      { status: 502 }
    );
  }
}
