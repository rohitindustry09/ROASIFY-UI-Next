import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/crypto";
import { generateCode, createChallenge, discardChallenge } from "@/lib/otpStore";
import { sendOtpEmail } from "@/lib/mailer";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const isProd = process.env.NODE_ENV === "production";
  const code = generateCode();

  let challenge;
  try {
    challenge = await createChallenge(email, code);
  } catch (err) {
    console.error("[otp] failed to store challenge:", err.message);
    return NextResponse.json({ error: "Couldn't send a code right now. Try again." }, { status: 500 });
  }

  if (!challenge.ok) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait before trying again.", retryAfterSec: challenge.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(challenge.retryAfterSec) } }
    );
  }

  try {
    await sendOtpEmail(email, code);
    return NextResponse.json({ ok: true, emailSent: true });
  } catch (err) {
    console.error("[otp] failed to send email:", err.message);
    if (isProd) {
      // Don't pretend it worked: drop the challenge (so the failed send
      // doesn't eat the user's resend budget) and report the failure.
      await discardChallenge(email).catch(() => {});
      return NextResponse.json({ error: "We couldn't send the email. Try again shortly." }, { status: 502 });
    }
    // Dev only: surface the code so a missing email setup doesn't block local work.
    console.log(`[dev] OTP for ${email}: ${code}`);
    return NextResponse.json({ ok: true, emailSent: false, devCode: code });
  }
}
