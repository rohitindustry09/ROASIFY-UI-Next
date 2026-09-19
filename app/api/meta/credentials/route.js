import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveMetaCredentials, getMetaCredentials, deleteMetaCredentials } from "@/lib/metaCredentials";

// GET: only reports whether credentials exist and the business ID (never
// the token itself -- that never needs to leave the server once saved).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const creds = await getMetaCredentials(session.email);
    return NextResponse.json({ configured: Boolean(creds), businessId: creds?.businessId || null });
  } catch (err) {
    console.error("[meta credentials GET] failed:", err.message);
    return NextResponse.json({ error: "Couldn't check your credentials." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { businessId, systemUserToken } = await request.json();
  if (!businessId?.trim() || !systemUserToken?.trim()) {
    return NextResponse.json({ error: "Both Business ID and System User Token are required." }, { status: 400 });
  }

  try {
    await saveMetaCredentials(session.email, businessId.trim(), systemUserToken.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[meta credentials POST] failed:", err.message);
    return NextResponse.json({ error: "Couldn't save your credentials. Try again." }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    await deleteMetaCredentials(session.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[meta credentials DELETE] failed:", err.message);
    return NextResponse.json({ error: "Couldn't remove your credentials." }, { status: 500 });
  }
}
