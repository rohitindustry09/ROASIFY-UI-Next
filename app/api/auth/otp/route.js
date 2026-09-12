import { NextResponse } from "next/server";
import { issueCode } from "@/lib/otpStore";

export async function POST(request) {
  const { email } = await request.json();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const code = issueCode(email);

  // No email provider wired up yet — log it server-side and, in dev only,
  // hand it back in the response so the UI can show it. Remove `devCode`
  // once a real sender (Resend, Postmark, etc.) is wired in.
  console.log(`[dev] OTP for ${email}: ${code}`);

  return NextResponse.json({
    ok: true,
    devCode: process.env.NODE_ENV !== "production" ? code : undefined,
  });
}
