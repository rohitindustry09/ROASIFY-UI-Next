import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getConnectionTokens } from "@/lib/connections";
import { fetchMetaOverview } from "@/lib/metaApi";

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

  try {
    const overview = await fetchMetaOverview(connection.accessToken);
    return NextResponse.json({ label: connection.label, ...overview });
  } catch (err) {
    console.error("[sync/meta] fetch failed:", err.message);
    return NextResponse.json(
      { error: "Couldn't fetch data from Meta. The token may have expired or been revoked." },
      { status: 502 }
    );
  }
}
