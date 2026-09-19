import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMetaCredentials } from "@/lib/metaCredentials";
import { listClientAdAccounts } from "@/lib/metaSystemUser";
import { listConnections, addConnection } from "@/lib/connections";

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { accountId } = await request.json();
  if (!accountId) return NextResponse.json({ error: "Missing accountId." }, { status: 400 });

  const creds = await getMetaCredentials(session.email).catch(() => null);
  if (!creds) {
    return NextResponse.json({ error: "Save your Meta Business credentials first." }, { status: 400 });
  }

  // Re-verify server-side rather than trusting whatever the client sends --
  // confirms the account is genuinely shared with this user's own business,
  // and that they haven't already added it (double-click, stale list, etc).
  let shared, existing;
  try {
    [shared, existing] = await Promise.all([
      listClientAdAccounts(creds.businessId, creds.systemUserToken),
      listConnections(session.email),
    ]);
  } catch (err) {
    console.error("[meta claim] verification fetch failed:", err.message);
    return NextResponse.json({ error: "Couldn't verify that account with Meta. Try again." }, { status: 502 });
  }

  const account = shared.find((a) => a.id === accountId);
  if (!account) {
    return NextResponse.json({ error: "That account isn't shared with your business." }, { status: 404 });
  }

  const already = existing.find((c) => c.platform === "meta" && c.meta?.adAccountId === accountId);
  if (already) {
    return NextResponse.json({ ok: true, id: already.id, alreadyExisted: true });
  }

  try {
    const saved = await addConnection({
      userEmail: session.email,
      platform: "meta",
      label: `${account.name} (${account.id})`,
      accessToken: creds.systemUserToken, // this user's own token, stored per-connection
      meta: { adAccountId: account.id, currency: account.currency },
    });
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err) {
    console.error("[meta claim] failed to save connection:", err.message);
    return NextResponse.json({ error: "Couldn't save that connection. Try again." }, { status: 500 });
  }
}
