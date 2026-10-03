"use client";

import { useEffect, useState } from "react";


const INPUT_CLASS =
  "w-full rounded-[14px] border border-line px-4 py-3 text-[13px] text-navy outline-none placeholder:text-text-dim focus:border-[#566CBD]";
const LABEL_CLASS = "mb-1.5 block text-[12.5px] font-semibold text-navy";

// Optional path for stores that can't install the shared Roasify app (e.g.
// not a development store): the owner creates their own Shopify app and
// pastes its Client ID + secret here, once per store.
export default function ShopifyOwnAppForm({ children }) {
  const [site, setSite] = useState("");
  useEffect(() => setSite(window.location.origin), []);
  const [open, setOpen] = useState(false);
  const [shop, setShop] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/connect/shopify/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, clientId, clientSecret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't start the connection. Try again.");
        setLoading(false);
        return;
      }
      window.location.assign(data.redirectUrl);
    } catch {
      setError("Couldn't reach Roasify. Check your connection and try again.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <>
        {children}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full text-center text-[12.5px] font-semibold text-[#566CBD] hover:underline"
        >
          Not a development store? Connect with your own Shopify app
        </button>
      </>
    );
  }

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]"
    >
      <h2 className="mb-1 font-display text-[16px] font-bold text-navy">Use your own Shopify app</h2>
      <p className="mb-4 text-[12.5px] leading-relaxed text-text-dim">
        Create an app for this store in your Shopify Dev Dashboard, then paste its credentials
        below. Set its scopes to <span className="font-mono">read_orders,read_products</span> and
        add <span className="break-all font-mono">{site}/api/connect/shopify/callback</span> as an
        allowed redirection URL. Roasify keeps the secret only until the install finishes.
      </p>

      <div className="mb-3">
        <label htmlFor="own-shop" className={LABEL_CLASS}>
          Store domain
        </label>
        <input
          id="own-shop"
          required
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          placeholder="yourstore.myshopify.com"
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="own-client-id" className={LABEL_CLASS}>
          Client ID
        </label>
        <input
          id="own-client-id"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          autoComplete="off"
          className={`${INPUT_CLASS} font-mono`}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="own-client-secret" className={LABEL_CLASS}>
          Client secret
        </label>
        <input
          id="own-client-secret"
          type="password"
          required
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          autoComplete="off"
          className={`${INPUT_CLASS} font-mono`}
        />
      </div>

      {error && <p className="mb-3 text-[12.5px] text-red">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="pill w-full rounded-full bg-lime py-3 text-[13px] font-extrabold text-navy hover:bg-lime-dark disabled:opacity-60"
      >
        {loading ? "Redirecting to Shopify…" : "Continue to Shopify"}
      </button>
    </form>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-4 w-full text-center text-[12.5px] font-semibold text-[#566CBD] hover:underline"
      >
        Back to the standard connection
      </button>
    </>
  );
}
