import { NextResponse } from "next/server";
import { verifyCode } from "@/lib/otpStore";
import { buildSessionCookie } from "@/lib/session";

export async function POST(request) {
  const { email, code } = await request.json();

  if (!email || !code) {
    return NextResponse.json({ error: "Missing email or code." }, { status: 400 });
  }

  const valid = verifyCode(email, code);
  if (!valid) {
    return NextResponse.json({ error: "That code didn't work." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const { name, value, options } = await buildSessionCookie(email);
  response.cookies.set(name, value, options);
  return response;
}
