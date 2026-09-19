import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listClientAdAccounts } from "@/lib/metaSystemUser";
import { getClaimedMetaAccountIds, addConnection } from "@/lib/connections";

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { accountId } = await request.json();
  if (!accountId) return NextResponse.json({ error: "Missing accountId." }, { status: 400 });

  // Re-check server-side rather than trusting whatever the client sends --
  // both that the account is genuinely shared with Roasify's business, and
  // that nobody claimed it in the moment between listing and this request.
  let shared, claimed;
  try {
    [shared, claimed] = await Promise.all([listClientAdAccounts(), getClaimedMetaAccountIds()]);
  } catch (err) {
    console.error("[meta claim] verification fetch failed:", err.message);
    return NextResponse.json({ error: "Couldn't verify that account with Meta. Try again." }, { status: 502 });
  }

  const account = shared.find((a) => a.id === accountId);
  if (!account) {
    return NextResponse.json({ error: "That account isn't shared with Roasify." }, { status: 404 });
  }
  if (claimed.has(accountId)) {
    return NextResponse.json({ error: "That account was just claimed by someone else." }, { status: 409 });
  }

  try {
    await addConnection({
      userEmail: session.email,
      platform: "meta",
      label: `${account.name} (${account.id})`,
      accessToken: process.env.META_SYSTEM_USER_TOKEN, // shared token, not per-user
      meta: { adAccountId: account.id, currency: account.currency },
    });
  } catch (err) {
    console.error("[meta claim] failed to save connection:", err.message);
    return NextResponse.json({ error: "Couldn't save that connection. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
