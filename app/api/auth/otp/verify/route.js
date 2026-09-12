import { NextResponse } from "next/server";
import { OTP_COOKIE_NAME, verifyOtpChallenge, clearOtpChallengeCookie } from "@/lib/otpChallenge";
import { buildSessionCookie } from "@/lib/session";

export async function POST(request) {
  const { email, code } = await request.json();

  if (!email || !code) {
    return NextResponse.json({ error: "Missing email or code." }, { status: 400 });
  }

  const challengeCookie = request.cookies.get(OTP_COOKIE_NAME)?.value;
  const valid = await verifyOtpChallenge(challengeCookie, email, code);
  if (!valid) {
    return NextResponse.json({ error: "That code didn't work." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const session = await buildSessionCookie(email);
  response.cookies.set(session.name, session.value, session.options);

  // One-time use: burn the challenge so the same code can't be replayed.
  const cleared = clearOtpChallengeCookie();
  response.cookies.set(cleared.name, cleared.value, cleared.options);

  return response;
}
