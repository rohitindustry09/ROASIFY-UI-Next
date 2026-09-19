"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MetaClaimFlow() {
  const [configured, setConfigured] = useState(null); // null = still checking
  const [businessId, setBusinessId] = useState(null);

  function checkCredentials() {
    fetch("/api/meta/credentials")
      .then((res) => res.json())
      .then((json) => {
        setConfigured(json.configured);
        setBusinessId(json.businessId);
      })
      .catch(() => setConfigured(false));
  }

  useEffect(checkCredentials, []);

  if (configured === null) {
    return <p className="text-[13.5px] text-text-dim">Checking your Meta setup...</p>;
  }

  if (!configured) {
    return <CredentialsForm onSaved={checkCredentials} />;
  }

  return <AccountPicker businessId={businessId} onCredentialsCleared={checkCredentials} />;
}

function CredentialsForm({ onSaved }) {
  const [businessId, setBusinessId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/meta/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, systemUserToken: token }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Couldn't save your credentials.");
      return;
    }
    onSaved();
  }

  return (
    <div className="w-full max-w-lg">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Connect Meta ads</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Roasify uses your own Meta Business Portfolio to read whichever client ad accounts are
        shared with it — enter your own credentials below, once.
      </p>

      <div className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
        <h2 className="mb-2 text-[13.5px] font-bold text-navy">Where to find these</h2>
        <ol className="mb-5 list-decimal space-y-1.5 pl-4 text-[12.5px] leading-relaxed text-navy/80">
          <li>Your Business ID is in Meta Business Settings → Business Info</li>
          <li>Create a System User: Business Settings → Users → System Users → Add</li>
          <li>Assign your app to it, then generate a token with <code>ads_read</code> scope — choose "Never" for expiration if offered</li>
        </ol>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-navy">Business ID</label>
            <input
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              required
              placeholder="123456789012345"
              className="w-full rounded-[14px] border border-line px-4 py-3 text-[13px] text-navy outline-none placeholder:text-text-dim focus:border-[#566CBD]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-navy">System User Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              type="password"
              placeholder="EAAxxxxxxxxxxxx..."
              className="w-full rounded-[14px] border border-line px-4 py-3 text-[13px] text-navy outline-none placeholder:text-text-dim focus:border-[#566CBD]"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-bg px-3 py-2 text-[12px] text-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="pill w-full rounded-full bg-lime py-3 text-[13px] font-extrabold text-navy hover:bg-lime-dark disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save and continue"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-text-dim">
        Your token is encrypted before it's stored and is never shown again after saving.
      </p>
    </div>
  );
}

function AccountPicker({ businessId, onCredentialsCleared }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [resetting, setResetting] = useState(false);

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

  async function analyze(accountId) {
    setClaimingId(accountId);
    setError(null);
    const res = await fetch("/api/meta/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const json = await res.json();
    setClaimingId(null);
    if (!res.ok) {
      setError(json.error || "Couldn't analyze that account.");
      return;
    }
    router.push(`/dashboard/meta-data/${json.id}`);
  }

  async function resetCredentials() {
    setResetting(true);
    await fetch("/api/meta/credentials", { method: "DELETE" });
    setResetting(false);
    onCredentialsCleared();
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-[22px] font-bold text-navy">Client ad accounts</h1>
        <button
          onClick={resetCredentials}
          disabled={resetting}
          className="text-[11.5px] font-semibold text-text-dim hover:text-navy disabled:opacity-50"
        >
          {resetting ? "..." : "Change credentials"}
        </button>
      </div>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Every account shared with your Business ({businessId}) — click Analyze to pull its data.
      </p>

      <div className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-navy">Accounts</h2>
          <button onClick={load} className="text-[12px] font-semibold text-accent hover:underline">
            Check again
          </button>
        </div>

        {loading && <p className="text-[12.5px] text-text-dim">Loading...</p>}

        {error && <p className="mb-3 rounded-lg bg-red-bg px-3 py-2 text-[12px] text-red">{error}</p>}

        {!loading && accounts && accounts.length === 0 && (
          <p className="text-[12.5px] text-text-dim">
            No new shared accounts found. Share a client's ad account with your Business ID from
            their Meta Business Settings, then click "Check again".
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
                  onClick={() => analyze(a.id)}
                  disabled={claimingId === a.id}
                  className="rounded-full bg-lime px-4 py-1.5 text-[12px] font-bold text-navy hover:bg-lime-dark disabled:opacity-50"
                >
                  {claimingId === a.id ? "Loading..." : "Analyze"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
