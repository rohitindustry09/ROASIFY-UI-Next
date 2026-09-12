export default function PlatformConnectCard({ name, description, connected, connectHref }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-ink2 p-6">
      <div>
        <h3 className="text-base font-medium text-paper">{name}</h3>
        <p className="mt-1 max-w-md text-sm text-mist">{description}</p>
      </div>

      {connected ? (
        <span className="flex items-center gap-2 rounded-md border border-mint/30 bg-mint/10 px-4 py-2 text-sm text-mint">
          Connected
        </span>
      ) : (
        <a
          href={connectHref}
          className="rounded-md border border-line px-4 py-2 text-sm text-paper transition-colors hover:border-mist"
        >
          Connect
        </a>
      )}
    </div>
  );
}
