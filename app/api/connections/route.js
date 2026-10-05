import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listConnections } from "@/lib/connections";

// The signed-in user's connections, without any tokens.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const connections = await listConnections(session.email);
    return NextResponse.json({
      connections: connections.map(({ id, platform, label, status }) => ({ id, platform, label, status })),
    });
  } catch (err) {
    console.error("[connections GET] failed:", err.message);
    return NextResponse.json({ error: "Couldn't load your connections." }, { status: 500 });
  }
}
