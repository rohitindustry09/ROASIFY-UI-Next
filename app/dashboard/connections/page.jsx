import PlatformConnectCard from "@/components/PlatformConnectCard";

const PLATFORMS = [
  {
    key: "shopify",
    name: "Shopify",
    description: "Reads orders, revenue, and product variants.",
  },
  {
    key: "meta",
    name: "Meta ads",
    description: "Reads spend, impressions, and CTR per product ad.",
  },
  {
    key: "google",
    name: "Google ads",
    description: "Reads cost and conversions per item ID.",
  },
];

export default function ConnectionsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium text-paper">Connections</h1>
      <p className="mt-2 text-sm text-mist">
        Roasify pulls fresh data from each platform on a schedule and stores it in
        your own account — nothing is read live on every page load.
      </p>

      <div className="mt-8 space-y-4">
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
