import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listConnections } from "@/lib/connections";
import { PLATFORMS } from "@/lib/platforms";
import ConnectionsList from "@/components/ConnectionsList";

export default async function ConnectionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const connections = await listConnections(session.email).catch((err) => {
    console.error("[connections page]", err.message);
    return [];
  });

  return (
    <div className="stagger max-w-2xl">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Connections</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Roasify pulls fresh data from each platform on a schedule and stores it in
        your own account — nothing is read live on every page load. You can connect
        more than one store or ad account per platform.
      </p>

      <div className="space-y-4">
        {Object.values(PLATFORMS).map((p) => (
          <ConnectionsList key={p.key} platform={p} connections={connections} />
        ))}
      </div>
    </div>
  );
}
