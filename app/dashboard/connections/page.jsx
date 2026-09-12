import PlatformConnectCard from "@/components/PlatformConnectCard";

const PLATFORMS = [
  { key: "shopify", name: "Shopify", description: "Reads orders, revenue, and product variants." },
  { key: "meta", name: "Meta ads", description: "Reads spend, impressions, and CTR per product ad." },
  { key: "google", name: "Google ads", description: "Reads cost and conversions per item ID." },
];

export default function ConnectionsPage() {
  return (
    <div className="stagger max-w-2xl">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Connections</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Roasify pulls fresh data from each platform on a schedule and stores it in
        your own account — nothing is read live on every page load.
      </p>

      <div className="space-y-4">
        {PLATFORMS.map((p) => (
          <PlatformConnectCard
            key={p.key}
            name={p.name}
            description={p.description}
            connected={false}
            connectHref={`/api/connect/${p.key}`}
          />
        ))}
      </div>
    </div>
  );
}
