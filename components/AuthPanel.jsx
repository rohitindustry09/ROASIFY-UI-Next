"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const OTP_LENGTH = 6;

export default function AuthPanel() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState("start"); // start | otp
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const otpRefs = useRef([]);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, the browser is redirected to Google — nothing else to do here.
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
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
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) {
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
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-medium text-paper">Sign in to Roasify</h1>
      <p className="mt-2 text-sm text-mist">
        No password to remember. Use Google, or a one-time code sent to your email.
      </p>

      {step === "start" && (
        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-line bg-ink2 py-3 text-sm font-medium text-paper transition-colors hover:border-mist disabled:opacity-50"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-mist">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSendOtp} className="space-y-3">
            <label htmlFor="email" className="block text-sm text-mist">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@store.com"
              className="w-full rounded-md border border-line bg-ink2 px-4 py-3 text-sm text-paper placeholder:text-mist/60 outline-none focus:border-mint"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-mint py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Continue with email
            </button>
          </form>
        </div>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="mt-8 space-y-5">
          <div>
            <p className="text-sm text-paper">
              We sent a code to <span className="font-medium">{email}</span>
            </p>
            <button
              type="button"
              onClick={() => setStep("start")}
              className="mt-1 text-sm text-mist underline decoration-line underline-offset-4 hover:text-paper"
            >
              Use a different email
            </button>
          </div>

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
                className="h-14 w-12 rounded-md border border-line bg-ink2 text-center text-lg font-mono text-paper outline-none focus:border-mint"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-mint py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Verify and continue
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </p>
      )}

      <p className="mt-8 text-xs leading-relaxed text-mist">
        By continuing, you agree that Roasify can read the ad and order data from any
        platform you choose to connect. You can disconnect at any time from Settings.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
