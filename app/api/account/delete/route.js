import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/session";
import { removeAllConnectionsForUser } from "@/lib/connections";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    await removeAllConnectionsForUser(session.email);
  } catch (err) {
    console.error("[account delete] failed to remove connections:", err.message);
    return NextResponse.json({ error: "Couldn't delete your data. Try again." }, { status: 500 });
  }

  // There's no separate "users" table -- a user's account is just their
  // email plus whatever connections exist for it, so removing every
  // connection and ending the session is a complete account deletion.
  const response = NextResponse.json({ ok: true });
  const { name, value, options } = clearSessionCookie();
  response.cookies.set(name, value, options);
  return response;
}
