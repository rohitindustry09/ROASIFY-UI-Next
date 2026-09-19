import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listClientAdAccounts } from "@/lib/metaSystemUser";
import { getClaimedMetaAccountIds } from "@/lib/connections";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const [shared, claimed] = await Promise.all([listClientAdAccounts(), getClaimedMetaAccountIds()]);
    const available = shared.filter((acct) => !claimed.has(acct.id));
    return NextResponse.json({ accounts: available });
  } catch (err) {
    console.error("[meta available-accounts] failed:", err.message);
    return NextResponse.json(
      { error: "Couldn't reach Meta. Check META_BUSINESS_ID and META_SYSTEM_USER_TOKEN." },
      { status: 502 }
    );
  }
}
