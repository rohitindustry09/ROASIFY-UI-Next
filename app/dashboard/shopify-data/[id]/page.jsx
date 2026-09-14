"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ShopifyDataPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sync/shopify/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load.");
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-[13.5px] text-text-dim">Loading live data from Shopify...</p>;
  }

  if (error) {
    return (
      <div className="max-w-md rounded-2xl border border-[#FECACA] bg-red-bg p-6">
        <p className="text-[13px] text-red">{error}</p>
      </div>
    );
  }

  const fmt = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency || "USD" }).format(n);

  return (
    <div className="stagger max-w-[900px]">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">{data.shop}</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Live from Shopify — fetched just now, not cached.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card label="Total products" value={data.productCount.toLocaleString()} />
        <Card label="Total orders" value={data.orderCount.toLocaleString()} />
        <Card label={`Revenue (last ${data.orders.length})`} value={fmt(data.recentRevenue)} />
      </div>

      <h2 className="mb-3 text-[14px] font-bold text-navy">Recent orders</h2>
      <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-[#FAFAFB] text-left text-text-dim">
              <th className="px-4 py-2.5 font-semibold">Order</th>
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-medium text-navy">{o.name}</td>
                <td className="px-4 py-2.5 text-text-dim">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-text-dim">{o.status}</td>
                <td className="px-4 py-2.5 tabular text-navy">{fmt(o.total)}</td>
              </tr>
            ))}
            {data.orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-dim">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-[14px] font-bold text-navy">Recent products</h2>
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-[#FAFAFB] text-left text-text-dim">
              <th className="px-4 py-2.5 font-semibold">Product</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Inventory</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-medium text-navy">{p.title}</td>
                <td className="px-4 py-2.5 text-text-dim capitalize">{p.status?.toLowerCase()}</td>
                <td className="px-4 py-2.5 tabular text-text-dim">{p.totalInventory}</td>
              </tr>
            ))}
            {data.products.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-dim">
                  No products yet.
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
