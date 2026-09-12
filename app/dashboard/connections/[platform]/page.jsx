import { notFound } from "next/navigation";
import { getPlatform } from "@/lib/platforms";

const ERROR_COPY = {
  "not-configured":
    "This platform isn't set up yet — the app doesn't have developer credentials for it. See README.md \u2192 \"Connecting platforms\".",
  "missing-shop": "Enter your store's .myshopify.com domain before continuing.",
};

export default function ConnectPlatformPage({ params, searchParams }) {
  const platform = getPlatform(params.platform);
  if (!platform) notFound();

  const error = searchParams?.error ? ERROR_COPY[searchParams.error] || "Something went wrong." : null;

  return (
    <div className="stagger max-w-md">
      <h1 className="mb-1 font-display text-[22px] font-bold text-navy">
        Connect {platform.name}
      </h1>
      <p className="mb-6 text-[13.5px] text-text-dim">
        You'll be sent to {platform.name}'s own sign-in screen. If you're already
        signed in to {platform.name} in this browser, it'll offer to continue with
        that account directly — Roasify never sees your {platform.name} password.
      </p>

      {error && (
        <p className="mb-5 rounded-xl border border-[#FECACA] bg-red-bg px-4 py-3 text-[13px] leading-relaxed text-red">
          {error}
        </p>
      )}

      <form
        action={`/api/connect/${platform.key}`}
        method="GET"
        className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,30,80,.03)]"
      >
        {platform.needsShopDomain && (
          <div className="mb-4">
            <label htmlFor="shop" className="mb-1.5 block text-[12.5px] font-semibold text-navy">
              Your store domain
            </label>
            <div className="flex items-center overflow-hidden rounded-[14px] border border-line focus-within:border-[#566CBD]">
              <input
                id="shop"
                name="shop"
                type="text"
                required
                placeholder="yourstore"
                className="w-full px-4 py-3 text-[13px] text-navy outline-none placeholder:text-text-dim"
              />
              <span className="whitespace-nowrap bg-[#FAFAFB] px-3 py-3 text-[12.5px] text-text-dim">
                .myshopify.com
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="pill w-full rounded-full bg-lime py-3 text-[13px] font-extrabold text-navy hover:bg-lime-dark hover:shadow-[0_4px_14px_-4px_rgba(207,224,94,.7)]"
        >
          Continue to {platform.name}
        </button>
      </form>
    </div>
  );
}
