import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listConnections } from "@/lib/connections";
import { PLATFORMS } from "@/lib/platforms";
import ConnectionsList from "@/components/ConnectionsList";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const connections = await listConnections(session.email).catch((err) => {
    console.error("[profile page]", err.message);
    return [];
  });

  return (
    <div className="stagger max-w-2xl">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">Profile</h1>
      <p className="mb-6 text-[13.5px] text-text-dim">Signed in as {session.email}</p>

      <div className="mb-8 rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
        <h2 className="mb-1 text-[14px] font-bold text-navy">Account</h2>
        <p className="text-[12.5px] text-text-dim">{session.email}</p>
      </div>

      <h2 className="mb-3 text-[14px] font-bold text-navy">Connected platforms</h2>
      <div className="space-y-4">
        {Object.values(PLATFORMS).map((p) => (
          <ConnectionsList key={p.key} platform={p} connections={connections} />
        ))}
      </div>
    </div>
  );
}
