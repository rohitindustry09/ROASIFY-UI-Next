"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MetaClaimFlow({ businessId }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [copied, setCopied] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/meta/available-accounts")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load.");
        setAccounts(json.accounts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function claim(accountId) {
    setClaimingId(accountId);
    const res = await fetch("/api/meta/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const json = await res.json();
    setClaimingId(null);
    if (!res.ok) {
      setError(json.error || "Couldn't claim that account.");
      return;
    }
    router.push("/dashboard/connections?connected=meta");
    router.refresh();
  }

  function copyId() {
    navigator.clipboard
      .writeText(businessId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        setError("Couldn't copy automatically — select and copy the ID manually.");
      });
  }

  return (
    <div className="w-full max-w-lg">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Connect Meta ads</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Roasify reads your ad data by asking you to share your ad account with its Business Portfolio
        — no login required on your end.
      </p>

      <div className="mb-6 rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
        <h2 className="mb-2 text-[13.5px] font-bold text-navy">Step 1 — Share your ad account</h2>
        <ol className="mb-4 list-decimal space-y-1.5 pl-4 text-[12.5px] leading-relaxed text-navy/80">
          <li>Go to your Meta Business Settings → Ad Accounts</li>
          <li>Select your ad account → Partners → Assign Partner</li>
          <li>Paste Roasify's Business ID below and grant "Ads reporting" access</li>
        </ol>

        <div className="flex items-center overflow-hidden rounded-[14px] border border-line">
          <code className="flex-1 truncate bg-[#FAFAFB] px-3.5 py-2.5 text-[13px] text-navy">
            {businessId || "Not configured yet"}
          </code>
          <button
            onClick={copyId}
            disabled={!businessId}
            className="whitespace-nowrap bg-white px-3.5 py-2.5 text-[12px] font-semibold text-accent hover:bg-[#FAFAFB] disabled:text-text-dim"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-navy">Step 2 — Pick your account</h2>
          <button onClick={load} className="text-[12px] font-semibold text-accent hover:underline">
            Check again
          </button>
        </div>

        {loading && <p className="text-[12.5px] text-text-dim">Checking for shared accounts...</p>}

        {error && (
          <p className="mb-3 rounded-lg bg-red-bg px-3 py-2 text-[12px] text-red">{error}</p>
        )}

        {!loading && accounts && accounts.length === 0 && (
          <p className="text-[12.5px] text-text-dim">
            No unclaimed shared accounts found yet — share your account (Step 1), then click
            "Check again". It can take a minute to show up.
          </p>
        )}

        {!loading && accounts && accounts.length > 0 && (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-line bg-[#FAFAFB] px-3.5 py-2.5"
              >
                <div>
                  <div className="text-[13px] font-medium text-navy">{a.name}</div>
                  <div className="text-[11px] text-text-dim">{a.id} · {a.currency}</div>
                </div>
                <button
                  onClick={() => claim(a.id)}
                  disabled={claimingId === a.id}
                  className="rounded-full bg-lime px-4 py-1.5 text-[12px] font-bold text-navy hover:bg-lime-dark disabled:opacity-50"
                >
                  {claimingId === a.id ? "Claiming..." : "This is mine"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-text-dim">
        Only claim an account you actually own — Roasify can't independently verify ownership beyond
        it being shared with this Business ID. Don't claim an account you don't recognize.
      </p>
    </div>
  );
}
