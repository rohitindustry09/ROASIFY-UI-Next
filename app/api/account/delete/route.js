import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/session";
import { removeAllConnectionsForUser } from "@/lib/connections";
import { deleteShopifyAppCredentials } from "@/lib/shopifyAppCredentials";
import { deleteMetaCredentials } from "@/lib/metaCredentials";
import { discardChallenge } from "@/lib/otpStore";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    await removeAllConnectionsForUser(session.email);
    await deleteMetaCredentials(session.email);
    await deleteShopifyAppCredentials(session.email);
    await discardChallenge(session.email);
  } catch (err) {
    console.error("[account delete] failed to remove connections:", err.message);
    return NextResponse.json({ error: "Couldn't delete your data. Try again." }, { status: 500 });
  }

  // There's no separate "users" table -- a user's account is just their
  // email plus whatever rows exist for it (connections, Meta credentials,
  // any pending sign-in code), so removing those and ending the session is
  // a complete account deletion.
  const response = NextResponse.json({ ok: true });
  const { name, value, options } = clearSessionCookie();
  response.cookies.set(name, value, options);
  return response;
}
