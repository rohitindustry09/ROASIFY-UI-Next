"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function MetaDataPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sync/meta/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load.");
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-[13.5px] text-text-dim">Loading live data from Meta...</p>;
  }

  if (error) {
    return (
      <div className="max-w-md rounded-2xl border border-[#FECACA] bg-red-bg p-6">
        <p className="text-[13px] text-red">{error}</p>
      </div>
    );
  }

  return (
    <div className="stagger max-w-[900px]">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Meta ad accounts</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Live from Meta, last 30 days — fetched just now, not cached.
      </p>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-[#FAFAFB] text-left text-text-dim">
              <th className="px-4 py-2.5 font-semibold">Account</th>
              <th className="px-4 py-2.5 font-semibold">Spend</th>
              <th className="px-4 py-2.5 font-semibold">Impressions</th>
              <th className="px-4 py-2.5 font-semibold">Clicks</th>
              <th className="px-4 py-2.5 font-semibold">CTR</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-medium text-navy">
                  {a.name}
                  {a.error && <span className="ml-2 text-[11px] text-red">(insights failed)</span>}
                </td>
                <td className="px-4 py-2.5 tabular text-navy">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: a.currency || "USD" }).format(a.spend)}
                </td>
                <td className="px-4 py-2.5 tabular text-text-dim">{a.impressions.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular text-text-dim">{a.clicks.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular text-text-dim">{a.ctr.toFixed(2)}%</td>
              </tr>
            ))}
            {data.accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-dim">
                  No ad accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
