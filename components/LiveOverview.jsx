"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PLATFORMS } from "@/lib/platforms";
import {
  combine,
  formatMoneyMap,
  normalizeGoogle,
  normalizeMeta,
  normalizeShopify,
} from "@/lib/overviewMetrics";

const NORMALIZERS = { shopify: normalizeShopify, meta: normalizeMeta, google: normalizeGoogle };
const ALL = "all";
const UPLOADED = "uploaded";

function money(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency && currency !== "UNKNOWN" ? currency : "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency ?? ""}`.trim();
  }
}
const num = (n) => Math.round(n || 0).toLocaleString("en-US");

// Live overview with a platform selector. The tab picks the platform, the
// chips pick which of that platform's connected accounts to include, and
// every number below is the sum of just those accounts.
export default function LiveOverview({ connections, uploadedView }) {
  const platformsPresent = useMemo(
    () => Object.keys(PLATFORMS).filter((key) => connections.some((c) => c.platform === key)),
    [connections]
  );

  const [tab, setTab] = useState(ALL);
  // unselected ids rather than selected ones, so newly listed accounts default to included
  const [excluded, setExcluded] = useState(() => new Set());
  const [results, setResults] = useState({}); // id -> { status, data?, error? }

  const load = useCallback(async (connection) => {
    setResults((prev) => ({ ...prev, [connection.id]: { status: "loading" } }));
    try {
      const res = await fetch(`/api/sync/${connection.platform}/${connection.id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load.");
      setResults((prev) => ({ ...prev, [connection.id]: { status: "ok", data: json } }));
    } catch (err) {
      setResults((prev) => ({ ...prev, [connection.id]: { status: "error", error: err.message } }));
    }
  }, []);

  useEffect(() => {
    connections.forEach(load);
  }, [connections, load]);

  const inTab = (c) => tab === ALL || c.platform === tab;
  const visible = connections.filter(inTab);
  const selected = visible.filter((c) => !excluded.has(c.id));

  const toggle = (id) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setAll = (include) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (include) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });

  const items = selected.map((c) => {
    const r = results[c.id];
    return { connection: c, state: r, metrics: r?.status === "ok" ? NORMALIZERS[c.platform](r.data) : null };
  });
  const totals = combine(items.map((i) => ({ platform: i.connection.platform, metrics: i.metrics })));
  const anyLoading = items.some((i) => i.state?.status === "loading");

  return (
    <div className="stagger max-w-[960px]">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Overview</h1>
      <p className="mb-5 text-[13.5px] text-text-dim">
        Live from your connected accounts, last 30 days. Choose a platform, then tick the accounts to include.
      </p>

      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        <TabButton active={tab === ALL} onClick={() => setTab(ALL)}>
          All platforms
        </TabButton>
        {platformsPresent.map((key) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {PLATFORMS[key].name}
          </TabButton>
        ))}
        <TabButton active={tab === UPLOADED} onClick={() => setTab(UPLOADED)}>
          Uploaded files
        </TabButton>
      </div>

      {tab === UPLOADED ? (
        uploadedView
      ) : (
        <>
          <AccountPicker
            connections={visible}
            excluded={excluded}
            results={results}
            showPlatform={tab === ALL}
            onToggle={toggle}
            onAll={() => setAll(true)}
            onNone={() => setAll(false)}
          />

          {selected.length === 0 ? (
            <p className="rounded-2xl border border-line bg-card p-6 text-[13px] text-text-dim">
              Select at least one account above to see its numbers.
            </p>
          ) : (
            <>
              <SummaryCards tab={tab} totals={totals} loading={anyLoading} />
              <AccountTable items={items} onRetry={load} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${
        active
          ? "bg-lime font-extrabold text-navy"
          : "border border-line bg-white text-navy hover:border-[#c9cee6]"
      }`}
    >
      {children}
    </button>
  );
}

function AccountPicker({ connections, excluded, results, showPlatform, onToggle, onAll, onNone }) {
  return (
    <div className="mb-5 rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12.5px] font-bold text-navy">Accounts</span>
        <span className="flex gap-3 text-[11.5px] font-semibold text-accent">
          <button type="button" onClick={onAll} className="hover:underline">
            Select all
          </button>
          <button type="button" onClick={onNone} className="hover:underline">
            Clear
          </button>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {connections.map((c) => {
          const on = !excluded.has(c.id);
          const failed = results[c.id]?.status === "error";
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(c.id)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${
                on ? "border-[#566CBD] bg-[#EEF1FB] text-navy" : "border-line bg-white text-text-dim"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border text-[9px] ${
                  on ? "border-[#566CBD] bg-[#566CBD] text-white" : "border-line"
                }`}
              >
                {on ? "✓" : ""}
              </span>
              {showPlatform && <span className="text-text-dim">{PLATFORMS[c.platform].name} ·</span>}
              {c.label}
              {failed && <span className="text-red">!</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCards({ tab, totals, loading }) {
  const revenue = formatMoneyMap(totals.revenueByCurrency, money);
  const spend = formatMoneyMap(totals.spendByCurrency, money);
  const roas = totals.roas ? `${totals.roas.value.toFixed(2)}x` : "—";

  let cards;
  if (tab === "shopify") {
    const aov = Object.keys(totals.revenueByCurrency).length === 1 && totals.orders > 0
      ? money(Object.values(totals.revenueByCurrency)[0] / totals.orders, Object.keys(totals.revenueByCurrency)[0])
      : "—";
    cards = [
      ["Revenue", revenue],
      ["Orders", num(totals.orders)],
      ["Avg. order value", aov],
    ];
  } else if (tab === "meta" || tab === "google") {
    cards = [
      ["Spend", spend],
      ["Impressions", num(totals.impressions)],
      ["Clicks", num(totals.clicks)],
      tab === "google" ? ["Conversions", num(totals.conversions)] : ["CTR", `${totals.ctr.toFixed(2)}%`],
    ];
  } else {
    cards = [
      ["Revenue", revenue],
      ["Ad spend", spend],
      ["ROAS", roas],
      ["Orders", num(totals.orders)],
    ];
  }

  const mixedCurrency =
    tab === ALL &&
    !totals.roas &&
    Object.keys(totals.revenueByCurrency).length + Object.keys(totals.spendByCurrency).length > 0;

  return (
    <>
      <div className={`grid grid-cols-2 gap-3 ${cards.length > 3 ? "md:grid-cols-4" : "md:grid-cols-3"} ${loading ? "opacity-60" : ""}`}>
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-card px-[17px] py-[15px]">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[.06em] text-text-dim">{label}</div>
            <div className="text-[19px] font-bold text-navy">{value}</div>
          </div>
        ))}
      </div>
      {mixedCurrency && (
        <p className="mt-3 text-[12px] text-text-dim">
          ROAS needs revenue and ad spend in the same currency (and at least one of each). Pick accounts that share a currency to see it.
        </p>
      )}
      {totals.partialRevenue && (
        <p className="mt-3 text-[12px] text-text-dim">
          One store has more than 1,000 orders in the last 30 days, so its revenue shows only the most recent 1,000.
        </p>
      )}
    </>
  );
}

function AccountTable({ items, onRetry }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-line bg-[#FAFAFB] text-left text-text-dim">
            <th className="px-4 py-2.5 font-semibold">Account</th>
            <th className="px-4 py-2.5 font-semibold">Platform</th>
            <th className="px-4 py-2.5 text-right font-semibold">Revenue / spend</th>
            <th className="px-4 py-2.5 text-right font-semibold">Orders / clicks</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {items.map(({ connection: c, state, metrics }) => (
            <tr key={c.id} className="border-b border-line last:border-0">
              <td className="px-4 py-2.5 font-medium text-navy">{c.label}</td>
              <td className="px-4 py-2.5 text-text-dim">{PLATFORMS[c.platform].name}</td>
              {state?.status === "error" ? (
                <td colSpan={2} className="px-4 py-2.5 text-red">
                  {state.error}{" "}
                  <button type="button" onClick={() => onRetry(c)} className="font-semibold underline">
                    Retry
                  </button>
                </td>
              ) : !metrics ? (
                <td colSpan={2} className="px-4 py-2.5 text-text-dim">
                  Loading…
                </td>
              ) : (
                <>
                  <td className="tabular px-4 py-2.5 text-right text-navy">
                    {c.platform === "shopify"
                      ? metrics.revenue == null ? "—" : money(metrics.revenue, metrics.currency)
                      : money(metrics.spend, metrics.currency)}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right text-navy">
                    {c.platform === "shopify" ? num(metrics.orders) : num(metrics.clicks)}
                  </td>
                </>
              )}
              <td className="px-4 py-2.5 text-right">
                <Link
                  href={`/dashboard/${c.platform}-data/${c.id}`}
                  className="text-[11.5px] font-semibold text-accent hover:underline"
                >
                  Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
