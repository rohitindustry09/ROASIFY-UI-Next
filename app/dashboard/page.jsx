"use client";

import Link from "next/link";
import { useData } from "@/state/DataContext";
import { fmtINR, fmtROI } from "@/lib/format";

export default function DashboardOverview() {
  const { merged, loaded } = useData();

  if (!loaded) return null;

  if (!merged) {
    return (
      <div className="stagger flex h-[70vh] flex-col items-center justify-center text-center">
        <div className="max-w-md rounded-2xl border border-line bg-card p-10 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
          <h1 className="mb-1 font-display text-[22px] font-bold text-navy">No data yet</h1>
          <p className="mb-6 text-[13.5px] leading-relaxed text-text-dim">
            Connect Shopify and at least one ad platform to see live product-level
            ROAS here. Or upload exports manually if you'd rather not connect an
            account yet.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard/connections"
              className="rounded-full bg-lime px-5 py-2.5 text-[13px] font-extrabold text-navy hover:bg-lime-dark hover:shadow-[0_4px_14px_-4px_rgba(207,224,94,.7)]"
            >
              Connect a platform
            </Link>
            <Link
              href="/dashboard/upload"
              className="rounded-full border border-line bg-white px-5 py-2.5 text-[13px] font-semibold text-navy hover:border-[#c9cee6] hover:shadow-[0_2px_8px_rgba(20,30,80,.06)]"
            >
              Upload CSV instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stagger max-w-[900px]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Overview</h1>
          <p className="text-[13.5px] text-text-dim">
            From your uploaded files — {merged.totals.products} products merged.
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="rounded-full border border-line bg-white px-4 py-2 text-[12.5px] font-semibold text-navy hover:border-[#c9cee6]"
        >
          Update data
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Total spend" value={fmtINR(merged.totals.totalSpend)} />
        <Card label="Revenue" value={fmtINR(merged.totals.revenue)} />
        <Card label="ROI" value={fmtROI(merged.totals.roi)} />
        <Card label="Items sold" value={merged.totals.items.toLocaleString("en-IN")} />
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/upload"
          className="rounded-full bg-lime px-5 py-2.5 text-[13px] font-extrabold text-navy hover:bg-lime-dark"
        >
          View full table
        </Link>
        <Link
          href="/dashboard/quadrant-view"
          className="rounded-full border border-line bg-white px-5 py-2.5 text-[13px] font-semibold text-navy hover:border-[#c9cee6]"
        >
          View quadrant breakdown
        </Link>
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
