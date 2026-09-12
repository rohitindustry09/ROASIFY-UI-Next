import Link from "next/link";

export default function DashboardOverview() {
  // Once a platform is connected, replace this with the merged product table —
  // read from your cached data, not the platform APIs directly.
  const hasConnection = false;

  if (!hasConnection) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-medium text-paper">No data yet</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            Connect Shopify and at least one ad platform to see live product-level
            ROAS here. Or upload exports manually if you'd rather not connect an
            account yet.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard/connections"
              className="rounded-md bg-mint px-5 py-2.5 text-sm font-medium text-ink hover:opacity-90"
            >
              Connect a platform
            </Link>
            <button className="rounded-md border border-line px-5 py-2.5 text-sm text-paper hover:border-mist">
              Upload CSV instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
