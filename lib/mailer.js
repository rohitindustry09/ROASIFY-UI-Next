import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("EMAIL_USER / EMAIL_APP_PASSWORD not set in .env.local");
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

export async function sendOtpEmail(to, code) {
  const t = getTransporter();
  await t.sendMail({
    from: `Roasify <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} is your Roasify sign-in code`,
    text: `Your Roasify sign-in code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
        <p style="font-size: 14px; color: #444;">Your Roasify sign-in code is:</p>
        <p style="font-size: 32px; font-weight: 600; letter-spacing: 4px; margin: 12px 0;">${code}</p>
        <p style="font-size: 13px; color: #888;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
      </div>
    `,
  });
}
