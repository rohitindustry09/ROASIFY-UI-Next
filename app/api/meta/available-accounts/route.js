import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMetaCredentials } from "@/lib/metaCredentials";
import { listClientAdAccounts } from "@/lib/metaSystemUser";
import { listConnections } from "@/lib/connections";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const creds = await getMetaCredentials(session.email).catch((err) => {
    console.error("[meta available-accounts] credentials lookup failed:", err.message);
    return null;
  });
  if (!creds) {
    return NextResponse.json({ configured: false, accounts: [] });
  }

  try {
    const [shared, existing] = await Promise.all([
      listClientAdAccounts(creds.businessId, creds.systemUserToken),
      listConnections(session.email),
    ]);
    // Only exclude accounts *this* user has already added -- there's no
    // shared pool to worry about anymore, since this list is already
    // scoped to this user's own business.
    const alreadyAdded = new Set(
      existing.filter((c) => c.platform === "meta").map((c) => c.meta?.adAccountId).filter(Boolean)
    );
    const available = shared.filter((acct) => !alreadyAdded.has(acct.id));
    return NextResponse.json({ configured: true, accounts: available });
  } catch (err) {
    console.error("[meta available-accounts] failed:", err.message);
    return NextResponse.json(
      { error: "Couldn't reach Meta with your saved credentials. Double-check your Business ID and token." },
      { status: 502 }
    );
  }
}
