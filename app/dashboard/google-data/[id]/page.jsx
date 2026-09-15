"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function GoogleDataPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sync/google/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load.");
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-[13.5px] text-text-dim">Loading live data from Google Ads...</p>;
  }

  if (error) {
    return (
      <div className="max-w-md rounded-2xl border border-[#FECACA] bg-red-bg p-6">
        <p className="text-[13px] text-red">{error}</p>
      </div>
    );
  }

  const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="stagger max-w-[900px]">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">{data.label}</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Live from Google Ads, last 30 days — fetched just now, not cached.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Cost" value={fmt(data.totals.cost)} />
        <Card label="Clicks" value={data.totals.clicks.toLocaleString()} />
        <Card label="Impressions" value={data.totals.impressions.toLocaleString()} />
        <Card label="Conversions" value={data.totals.conversions.toLocaleString()} />
      </div>

      <h2 className="mb-3 text-[14px] font-bold text-navy">Campaigns</h2>
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-[#FAFAFB] text-left text-text-dim">
              <th className="px-4 py-2.5 font-semibold">Campaign</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Cost</th>
              <th className="px-4 py-2.5 font-semibold">Clicks</th>
              <th className="px-4 py-2.5 font-semibold">Conversions</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c) => (
              <tr key={c.campaignId} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-medium text-navy">{c.name}</td>
                <td className="px-4 py-2.5 text-text-dim capitalize">{c.status?.toLowerCase()}</td>
                <td className="px-4 py-2.5 tabular text-navy">{fmt(c.cost)}</td>
                <td className="px-4 py-2.5 tabular text-text-dim">{c.clicks.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular text-text-dim">{c.conversions.toLocaleString()}</td>
              </tr>
            ))}
            {data.campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-dim">
                  No campaigns with activity in the last 30 days.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-[17px] py-[15px]">
      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[.06em] text-text-dim">
        {label}
      </div>
      <div className="text-[19px] font-bold text-navy">{value}</div>
    </div>
  );
}
