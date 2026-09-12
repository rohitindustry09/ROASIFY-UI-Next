import { NextResponse } from "next/server";
import { issueCode } from "@/lib/otpStore";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(request) {
  const { email } = await request.json();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const code = issueCode(email);

  try {
    await sendOtpEmail(email, code);
    return NextResponse.json({ ok: true, emailSent: true });
  } catch (err) {
    console.error(`[otp] Failed to send email to ${email}:`, err.message);
    console.log(`[dev] OTP for ${email}: ${code}`);
    // Fall back to showing the code in the UI so local dev isn't blocked
    // by a missing/broken email sender. Never do this in production.
    return NextResponse.json({
      ok: true,
      emailSent: false,
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  }
}
