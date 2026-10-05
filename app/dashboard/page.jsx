import { getSession } from "@/lib/session";
import { listConnections } from "@/lib/connections";
import LiveOverview from "@/components/LiveOverview";
import UploadedOverview from "@/components/UploadedOverview";

export default async function DashboardOverview() {
  const session = await getSession();
  const connections = session
    ? await listConnections(session.email).catch((err) => {
        console.error("[overview] couldn't list connections:", err.message);
        return [];
      })
    : [];

  // Nothing connected: keep the original upload-based overview and empty state.
  if (connections.length === 0) return <UploadedOverview />;

  return (
    <LiveOverview
      connections={connections.map(({ id, platform, label }) => ({ id, platform, label }))}
      uploadedView={<UploadedOverview />}
    />
  );
}
