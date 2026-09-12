import AuthPanel from "@/components/AuthPanel";

const LEDGER = [
  { label: "Champions scaling", value: "+18.4%", tone: "mint" },
  { label: "Total ROAS, last 7d", value: "7.6x", tone: "paper" },
  { label: "Casualties flagged", value: "12 SKUs", tone: "coral" },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-line bg-ink2 p-12 lg:flex">
        <div>
          <span className="font-mono text-sm tracking-tight text-mist">roasify</span>
          <h2 className="mt-16 max-w-sm text-3xl font-medium leading-snug text-paper">
            Every product's real ROI, pulled straight from your ad accounts.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist">
            Connect Shopify, Meta, and Google once. Roasify keeps the numbers current
            so you're never analysing last week's spend.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-ink p-6">
          <p className="text-xs text-mist">Synced 4 minutes ago</p>
          <div className="mt-4 space-y-3 font-mono text-sm tabular">
            {LEDGER.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-mist">{row.label}</span>
                <span
                  className={
                    row.tone === "mint"
                      ? "text-mint"
                      : row.tone === "coral"
                        ? "text-coral"
                        : "text-paper"
                  }
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex w-full items-center justify-center bg-ink px-6 lg:w-1/2">
        <AuthPanel />
      </section>
    </div>
  );
}
