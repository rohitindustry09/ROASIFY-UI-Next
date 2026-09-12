import { NextResponse } from "next/server";
import { buildOtpChallengeCookie } from "@/lib/otpChallenge";
import { sendOtpEmail } from "@/lib/mailer";

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request) {
  const { email } = await request.json();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const code = generateCode();
  const { name, value, options } = await buildOtpChallengeCookie(email, code);

  let emailSent = true;
  let devCode;
  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    console.error(`[otp] Failed to send email to ${email}:`, err.message);
    console.log(`[dev] OTP for ${email}: ${code}`);
    emailSent = false;
    // Fall back to showing the code in the UI so local dev isn't blocked
    // by a missing/broken email sender. Never do this in production.
    devCode = process.env.NODE_ENV !== "production" ? code : undefined;
  }

  const response = NextResponse.json({ ok: true, emailSent, devCode });
  // The code itself lives only in this signed, httpOnly cookie — never in
  // server memory — so verification works the same on a single dev server
  // as it does across Vercel's serverless instances.
  response.cookies.set(name, value, options);
  return response;
}
