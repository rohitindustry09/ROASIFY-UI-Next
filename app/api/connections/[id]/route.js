import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { removeConnection } from "@/lib/connections";

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    await removeConnection(params.id, session.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[connections] delete failed:", err.message);
    return NextResponse.json({ error: "Couldn't remove that connection." }, { status: 500 });
  }
}
