import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/crypto";
import { consumeChallenge } from "@/lib/otpStore";
import { buildSessionCookie } from "@/lib/session";

const CODE_PATTERN = /^\d{6}$/;

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const code = String(body?.code ?? "").trim();

  if (!email || !code) {
    return NextResponse.json({ error: "Missing email or code." }, { status: 400 });
  }
  if (!CODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "That code didn't work." }, { status: 401 });
  }

  let valid;
  try {
    valid = await consumeChallenge(email, code);
  } catch (err) {
    console.error("[otp verify] failed:", err.message);
    return NextResponse.json({ error: "Couldn't verify the code. Try again." }, { status: 500 });
  }
  if (!valid) {
    return NextResponse.json({ error: "That code didn't work." }, { status: 401 });
  }

  // consumeChallenge already deleted the code, so it can't be replayed.
  const response = NextResponse.json({ ok: true });
  const session = await buildSessionCookie(email);
  response.cookies.set(session.name, session.value, session.options);
  return response;
}
