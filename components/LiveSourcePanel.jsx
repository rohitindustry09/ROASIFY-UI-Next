"use client";

import { useState } from "react";
import Link from "next/link";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

// The alternative to choosing a file: pull the same data straight from the
// accounts connected for this platform. It produces rows in the uploaded-file
// format, so everything downstream (merge, table, quadrants) is unchanged.
export default function LiveSourcePanel({ platform, label, connections, onFile }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState(() => new Set(connections.map((c) => c.id)));
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [failures, setFailures] = useState([]);

  if (connections.length === 0) {
    return (
      <p className="px-4 pb-4 text-center text-[11.5px] text-text-dim">
        or{" "}
        <Link href={`/dashboard/connections/${platform}`} className="font-semibold text-accent hover:underline">
          connect {label}
        </Link>{" "}
        to use live data
      </p>
    );
  }

  const toggle = (id) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function handleFetch() {
    setError(null);
    setFailures([]);
    setBusy(true);
    try {
      const res = await fetch(`/api/live/${platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...chosen], days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't fetch live data.");

      const failed = data.accounts.filter((a) => !a.ok);
      setFailures(failed);
      if (data.rows.length === 0) {
        throw new Error(
          failed.length === data.accounts.length
            ? "None of the selected accounts could be read."
            : "No product-level data found for these accounts in that period."
        );
      }

      const used = data.accounts.filter((a) => a.ok).length;
      const notes = [];
      if (data.currencies.length > 1) notes.push(`Mixed currencies (${data.currencies.join(", ")}) are added together as-is.`);
      else if (data.currencies.length === 1) notes.push(`Amounts in ${data.currencies[0]}.`);
      if (data.partial) notes.push("Very large or complex orders were cut off, so figures may be slightly low.");

      onFile({
        name: `Live · ${used} ${used === 1 ? "account" : "accounts"} · last ${days} days`,
        size: 0,
        rows: data.rows,
        live: true,
        note: notes.join(" "),
      });
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="px-4 pb-4 text-center">
        <span className="mb-2 block text-[11px] text-text-dim">or</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-line bg-white px-4 py-2 text-[12.5px] font-semibold text-navy hover:border-[#c9cee6]"
        >
          Use connected {label} accounts
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 rounded-[14px] border border-line bg-[#FAFAFB] p-3.5">
      <div className="mb-2 text-[12px] font-bold text-navy">Pick accounts</div>
      <div className="mb-3 space-y-1.5">
        {connections.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 text-[12px] text-navy">
            <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} />
            <span className="truncate">{c.label}</span>
          </label>
        ))}
      </div>

      <select
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        aria-label="Date range"
        className="mb-3 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] text-navy"
      >
        {RANGES.map((r) => (
          <option key={r.days} value={r.days}>
            {r.label}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleFetch}
          disabled={busy || chosen.size === 0}
          className="flex-1 rounded-full bg-lime px-4 py-2 text-[12.5px] font-extrabold text-navy hover:bg-lime-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Fetching…" : "Fetch live data"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-full border border-line bg-white px-4 py-2 text-[12.5px] font-semibold text-navy"
        >
          Cancel
        </button>
      </div>

      {error && <p className="mt-2.5 rounded-lg bg-red-bg px-2.5 py-1.5 text-[11.5px] text-red">{error}</p>}
      {failures.map((f) => (
        <p key={f.id} className="mt-1.5 text-[11px] text-red">
          {f.label}: {f.error}
        </p>
      ))}
    </div>
  );
}
