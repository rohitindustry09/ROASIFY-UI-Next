export default function PlatformConnectCard({ name, description, connected, connectHref }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
      <div>
        <h3 className="font-display text-[16px] font-bold text-navy">{name}</h3>
        <p className="mt-1 max-w-md text-[12.5px] text-text-dim">{description}</p>
      </div>

      {connected ? (
        <span className="rounded-full bg-green-bg px-4 py-2 text-[12.5px] font-semibold text-green">
          Connected
        </span>
      ) : (
        <a
          href={connectHref}
          className="rounded-full border border-line bg-white px-4 py-2 text-[12.5px] font-semibold text-navy hover:border-[#c9cee6] hover:shadow-[0_2px_8px_rgba(20,30,80,.06)]"
        >
          Connect
        </a>
      )}
    </div>
  );
}
