"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const OTP_LENGTH = 6;

export default function AuthPanel() {
  const router = useRouter();

  const [step, setStep] = useState("start"); // start | otp
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devCode, setDevCode] = useState(null);
  const otpRefs = useRef([]);

  async function handleSendOtp(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Couldn't send a code. Try again.");
      return;
    }

    setDevCode(data.devCode ?? null);
    setStep("otp");
    setTimeout(() => otpRefs.current[0]?.focus(), 0);
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code }),
    });
    setLoading(false);

    if (!res.ok) {
      setError("That code didn't work. Check it and try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function handleOtpChange(index, value) {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div>
      <h1 className="font-display text-[22px] font-bold text-navy">Sign in to Roasify</h1>
      <p className="sub mt-1 text-[13px] text-text-dim">
        Enter your email and we'll send a one-time code — no password to remember.
      </p>

      {step === "start" && (
        <div className="mt-6 space-y-4">
          <button
            disabled
            title="Google sign-in needs an OAuth provider configured first"
            className="pill flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-line bg-white py-3 text-[13px] font-semibold text-text-dim opacity-70"
          >
            <GoogleMark />
            Continue with Google
            <span className="text-[11px]">(coming soon)</span>
          </button>

          <div className="flex items-center gap-3 text-[11px] text-text-dim">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSendOtp} className="space-y-3">
            <label htmlFor="email" className="block text-[12.5px] font-semibold text-navy">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@store.com"
              className="w-full rounded-[14px] border border-line bg-white px-4 py-3 text-[13px] text-navy outline-none placeholder:text-text-dim focus:border-[#566CBD]"
            />
            <button
              type="submit"
              disabled={loading}
              className="pill w-full rounded-full bg-lime py-3 text-[13px] font-extrabold text-navy hover:bg-lime-dark hover:shadow-[0_4px_14px_-4px_rgba(207,224,94,.7)] disabled:cursor-not-allowed disabled:bg-[#E7E9F2] disabled:text-[#9B9FB3] disabled:shadow-none"
            >
              {loading ? "Sending..." : "Continue with email"}
            </button>
          </form>
        </div>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="mt-6 animate-fadeSlideUp space-y-5">
          <div>
            <p className="text-[13px] text-navy">
              We sent a code to <span className="font-semibold">{email}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setStep("start");
                setDevCode(null);
                setOtp(Array(OTP_LENGTH).fill(""));
              }}
              className="mt-1 text-[12.5px] font-medium text-navy underline decoration-line underline-offset-4"
            >
              Use a different email
            </button>
          </div>

          {devCode && (
            <p className="animate-slideDownFade rounded-xl border border-[#DCE1FA] bg-[#F5F7FF] px-4 py-3 text-[13px] leading-relaxed text-navy">
              Couldn't send the email — using dev fallback. Your code is{" "}
              <span className="font-mono font-semibold">{devCode}</span>.
            </p>
          )}

          <div className="flex justify-between gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (otpRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="h-14 w-12 rounded-[14px] border border-line bg-white text-center text-lg font-semibold text-navy outline-none focus:border-[#566CBD]"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="pill w-full rounded-full bg-lime py-3 text-[13px] font-extrabold text-navy hover:bg-lime-dark hover:shadow-[0_4px_14px_-4px_rgba(207,224,94,.7)] disabled:cursor-not-allowed disabled:bg-[#E7E9F2] disabled:text-[#9B9FB3] disabled:shadow-none"
          >
            {loading ? "Verifying..." : "Verify and continue"}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 animate-fadeSlideUp rounded-lg bg-red-bg px-3 py-2 text-[11.5px] text-red">
          {error}
        </p>
      )}

      <p className="mt-6 text-[11px] leading-relaxed text-text-dim">
        By continuing, you agree that Roasify can read the ad and order data from any
        platform you choose to connect. You can disconnect at any time from Settings.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
