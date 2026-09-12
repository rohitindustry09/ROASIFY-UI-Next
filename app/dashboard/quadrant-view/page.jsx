"use client";

import Link from "next/link";
import { useData } from "@/state/DataContext";
import { quadrantSummary } from "@/lib/merge";
import { fmtINR, fmtROI } from "@/lib/format";

const QUADRANTS = [
  { key: "champions", label: "Champions", note: "High revenue, low spend", color: "green" },
  { key: "contenders", label: "Contenders", note: "High revenue, high spend", color: "blue" },
  { key: "cruisers", label: "Cruisers", note: "Low revenue, low spend", color: "gray" },
  { key: "casualties", label: "Casualties", note: "Low revenue, high spend", color: "red" },
];

const CARD_STYLE = {
  green: "border-[#BBF7D0] bg-[#F0FDF4]",
  blue: "border-[#BFDBFE] bg-[#EFF6FF]",
  gray: "border-line bg-[#FAFAFB]",
  red: "border-[#FECACA] bg-red-bg",
};

export default function QuadrantViewPage() {
  const { merged } = useData();

  if (!merged) {
    return (
      <div className="stagger flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="max-w-sm rounded-2xl border border-line bg-card p-8">
          <h1 className="mb-1 font-display text-[20px] font-bold text-navy">No merged data yet</h1>
          <p className="mb-5 text-[13px] text-text-dim">
            Upload and merge your files first to see the quadrant breakdown.
          </p>
          <Link
            href="/dashboard/upload"
            className="rounded-full bg-lime px-5 py-2.5 text-[13px] font-extrabold text-navy hover:bg-lime-dark"
          >
            Go to Upload &amp; merge
          </Link>
        </div>
      </div>
    );
  }

  const summary = quadrantSummary(merged.rows);

  return (
    <div className="stagger max-w-[1000px]">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Quadrant view</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Products classified against your own dataset's average spend and revenue.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => {
          const data = summary[q.key];
          return (
            <div key={q.key} className={`rounded-2xl border p-6 ${CARD_STYLE[q.color]}`}>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-display text-[16px] font-bold text-navy">{q.label}</h2>
                <span className="text-[12px] text-text-dim">{data.products} products</span>
              </div>
              <p className="mb-4 text-[12px] text-text-dim">{q.note}</p>
              <div className="flex gap-6 text-[13px]">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[.05em] text-text-dim">Spend</div>
                  <div className="font-semibold text-navy">{fmtINR(data.spend)}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-[.05em] text-text-dim">Revenue</div>
                  <div className="font-semibold text-navy">{fmtINR(data.revenue)}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-[.05em] text-text-dim">ROI</div>
                  <div className="font-semibold text-navy">{fmtROI(data.roi)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
