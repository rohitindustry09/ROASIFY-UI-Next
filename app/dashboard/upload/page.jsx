"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/state/DataContext";
import UploadCard from "@/components/UploadCard";
import { MetaIcon, ShopifyIcon, GoogleIcon } from "@/components/BrandIcons";
import { fmtINR, fmtROI, fmtNum } from "@/lib/format";

export default function UploadPage() {
  const { sources, setFile, clearFile, merged, runMergeNow, canMerge } = useData();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    if (!merged) return [];
    const list = search
      ? merged.rows.filter((r) => r.productTitle.toLowerCase().includes(search.toLowerCase()))
      : merged.rows;
    return [...list].sort((a, b) => b.revenue - a.revenue).slice(0, 25);
  }, [merged, search]);

  return (
    <div className="stagger max-w-[1100px]">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Upload &amp; merge</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Merge Meta Ads, Shopify, and Google Ads exports into one product-level table —
        entirely in your browser. Files are stored locally so you don't need to
        re-upload after a refresh.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <UploadCard
          source="meta"
          label="Meta Ads"
          required
          fields="Product ID · Month · Amount Spent · CTR · CPM"
          icon={<MetaIcon />}
          file={sources.meta}
          onFile={(f) => setFile("meta", f)}
          onClear={() => clearFile("meta")}
        />
        <UploadCard
          source="shopify"
          label="Shopify"
          required
          fields="Product Variant ID · Product Title · Total Sales · Net Items Sold"
          icon={<ShopifyIcon />}
          file={sources.shopify}
          onFile={(f) => setFile("shopify", f)}
          onClear={() => clearFile("shopify")}
        />
        <UploadCard
          source="google"
          label="Google Ads"
          fields="Item ID · Product Title · Cost · Conversions"
          icon={<GoogleIcon />}
          file={sources.google}
          onFile={(f) => setFile("google", f)}
          onClear={() => clearFile("google")}
        />
      </div>

      <div className="mb-6 flex items-center justify-between rounded-[18px] border border-line bg-card px-[18px] py-3.5">
        <span className="text-[13px] text-navy">
          <b className="font-bold">
            {[sources.meta, sources.shopify, sources.google].filter(Boolean).length} files
          </b>{" "}
          loaded — {canMerge ? "ready to merge" : "Meta + Shopify required"}
        </span>
        <button
          onClick={runMergeNow}
          disabled={!canMerge}
          className="flex items-center gap-1.5 rounded-full bg-lime px-5 py-2.5 text-[13px] font-extrabold text-navy hover:bg-lime-dark hover:shadow-[0_4px_14px_-4px_rgba(207,224,94,.7)] disabled:cursor-not-allowed disabled:bg-[#E7E9F2] disabled:text-[#9B9FB3] disabled:shadow-none"
        >
          Merge &amp; Analyse
        </button>
      </div>

      {merged && (
        <div className="animate-fadeSlideUp">
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-[18px] py-3">
            <span className="text-[13px] text-[#166534]">
              Merged {merged.totals.products} products across your uploaded files.
            </span>
            <Link href="/dashboard/quadrant-view" className="text-[13px] font-semibold text-[#166534] underline">
              View quadrant breakdown →
            </Link>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
            <SummaryCard label="Meta spend" value={fmtINR(merged.totals.metaSpend)} />
            <SummaryCard label="Google cost" value={fmtINR(merged.totals.googleCost)} />
            <SummaryCard label="Total spend" value={fmtINR(merged.totals.totalSpend)} />
            <SummaryCard label="Revenue" value={fmtINR(merged.totals.revenue)} />
            <SummaryCard label="ROI" value={fmtROI(merged.totals.roi)} accent />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-navy">Top products by revenue</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-56 rounded-full border border-line bg-white px-4 py-1.5 text-[12.5px] text-navy outline-none placeholder:text-text-dim focus:border-[#566CBD]"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-line bg-[#FAFAFB] text-left text-text-dim">
                  <th className="px-4 py-2.5 font-semibold">Product</th>
                  <th className="px-4 py-2.5 font-semibold">Spend</th>
                  <th className="px-4 py-2.5 font-semibold">Revenue</th>
                  <th className="px-4 py-2.5 font-semibold">ROI</th>
                  <th className="px-4 py-2.5 font-semibold">Items</th>
                  <th className="px-4 py-2.5 font-semibold">Quadrant</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="max-w-[280px] truncate px-4 py-2.5 font-medium text-navy">
                      {r.productTitle}
                    </td>
                    <td className="px-4 py-2.5 tabular text-text-dim">{fmtINR(r.totalSpend)}</td>
                    <td className="px-4 py-2.5 tabular text-navy">{fmtINR(r.revenue)}</td>
                    <td className="px-4 py-2.5 tabular font-semibold text-green">{fmtROI(r.roi)}</td>
                    <td className="px-4 py-2.5 tabular text-text-dim">{fmtNum(r.items)}</td>
                    <td className="px-4 py-2.5">
                      <QuadrantChip quadrant={r.quadrant} />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-dim">
                      No products match "{search}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-[17px] py-[15px]">
      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[.06em] text-text-dim">
        {label}
      </div>
      <div className={`text-[19px] font-bold ${accent ? "text-navy" : "text-navy"}`}>{value}</div>
    </div>
  );
}

const QUADRANT_STYLE = {
  champions: "bg-green-bg text-green",
  contenders: "bg-[#DBEAFE] text-[#2563EB]",
  cruisers: "bg-[#F3F4F6] text-text-dim",
  casualties: "bg-red-bg text-red",
};

function QuadrantChip({ quadrant }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${QUADRANT_STYLE[quadrant]}`}>
      {quadrant}
    </span>
  );
}
