import Link from "next/link";
import DisconnectButton from "@/components/DisconnectButton";

export default function ConnectionsList({ platform, connections }) {
  const forPlatform = connections.filter((c) => c.platform === platform.key);

  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-[16px] font-bold text-navy">{platform.name}</h3>
        <Link
          href={`/dashboard/connections/${platform.key}`}
          className="rounded-full border border-line bg-white px-4 py-1.5 text-[12px] font-semibold text-navy hover:border-[#c9cee6]"
        >
          {forPlatform.length > 0 ? "+ Connect another" : "Connect"}
        </Link>
      </div>
      <p className="mb-3 text-[12.5px] text-text-dim">{platform.description}</p>

      {forPlatform.length === 0 ? (
        <p className="text-[12.5px] text-text-dim">No {platform.name} accounts connected yet.</p>
      ) : (
        <div className="space-y-2">
          {forPlatform.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-line bg-[#FAFAFB] px-3.5 py-2.5"
            >
              <div>
                <div className="text-[13px] font-medium text-navy">{c.label}</div>
                <div className="text-[11px] text-text-dim">
                  Connected {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    c.status === "connected" ? "bg-green-bg text-green" : "bg-red-bg text-red"
                  }`}
                >
                  {c.status === "connected" ? "Connected" : "Error"}
                </span>
                <DisconnectButton id={c.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
