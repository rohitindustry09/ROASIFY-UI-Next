import Link from "next/link";

export default function DashboardOverview() {
  // Once a platform is connected, replace this with the merged product table —
  // read from your cached data, not the platform APIs directly.
  const hasConnection = false;

  if (!hasConnection) {
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
            <button className="rounded-full border border-line bg-white px-5 py-2.5 text-[13px] font-semibold text-navy hover:border-[#c9cee6] hover:shadow-[0_2px_8px_rgba(20,30,80,.06)]">
              Upload CSV instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
