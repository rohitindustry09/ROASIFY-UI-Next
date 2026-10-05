import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listConnections } from "@/lib/connections";
import { PLATFORMS } from "@/lib/platforms";
import ConnectionsList from "@/components/ConnectionsList";

export default async function ConnectionsPage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const connections = await listConnections(session.email).catch((err) => {
    console.error("[connections page]", err.message);
    return [];
  });

  const justConnected = searchParams?.connected;

  return (
    <div className="stagger max-w-2xl">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Connections</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        Roasify reads your connected accounts live when you open a page; you can connect
        more than one store or ad account per platform. Choose which to include on the
        Overview.
      </p>

      {justConnected && (
        <p className="mb-5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#166534]">
          Connected {justConnected} successfully.
        </p>
      )}

      <div className="space-y-4">
        {Object.values(PLATFORMS).map((p) => (
          <ConnectionsList key={p.key} platform={p} connections={connections} />
        ))}
      </div>
    </div>
  );
}
