import { notFound } from "next/navigation";
import { getPlatform } from "@/lib/platforms";
import ErrorAlertBadge from "@/components/ErrorAlertBadge";
import MetaClaimFlow from "@/components/MetaClaimFlow";

const ENV_VAR_HINTS = {
  shopify: "SHOPIFY_API_KEY / SHOPIFY_API_SECRET",
  meta: "META_APP_ID / META_APP_SECRET",
  google: "GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET (or GOOGLE_ADS_DEVELOPER_TOKEN, if the account list fetch is what failed)",
};

function getErrorCopy(errorCode, platform) {
  const hint = ENV_VAR_HINTS[platform.key];
  const map = {
    "not-configured":
      "This platform isn't set up yet — the app doesn't have developer credentials for it. See README.md \u2192 \"Connecting platforms\".",
    "missing-shop": "Enter your store's .myshopify.com domain before continuing.",
    "invalid-request": `That request didn't check out — try connecting from ${platform.name}'s own dashboard instead, or try again below.`,
    "token-exchange-failed": `${platform.name} approved the request but something failed right after. Double-check ${hint} in Vercel, then try again — if it's still unclear, check the Vercel Functions logs for the exact error.`,
    "save-failed": `Got a token from ${platform.name} but couldn't save it — check your database connection (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) and try again.`,
    "no-ad-accounts": `That ${platform.name} account doesn't have any ad accounts to connect. Try a different account, or check you granted access to at least one.`,
    "no-refresh-token":
      "Google didn't return a long-term token — this happens if you've connected before. Revoke access at myaccount.google.com/permissions (find Roasify) and try connecting again.",
  };
  return map[errorCode] || "Something went wrong.";
}

export default function ConnectPlatformPage({ params, searchParams }) {
  const platform = getPlatform(params.platform);
  if (!platform) notFound();

  const error = searchParams?.error ? getErrorCopy(searchParams.error, platform) : null;

  if (platform.key === "meta") {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="stagger relative w-full max-w-lg">
          <ErrorAlertBadge message={error} />
          <MetaClaimFlow />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center">
      <div className="stagger w-full max-w-md">
        <ErrorAlertBadge message={error} />

        <h1 className="mb-1 font-display text-[22px] font-bold text-navy">
          Connect {platform.name}
        </h1>
        <p className="mb-6 text-[13.5px] text-text-dim">
          You'll be sent to {platform.name}'s own sign-in screen. If you're already
          signed in to {platform.name} in this browser, it'll offer to continue with
          that account directly — Roasify never sees your {platform.name} password.
        </p>

        {platform.needsShopDomain && (
          <p className="mb-5 rounded-xl border border-line bg-[#FAFAFB] px-4 py-3 text-[12.5px] leading-relaxed text-text-dim">
            Prefer not to type your domain? Open your Shopify admin directly and install Roasify
            from there instead — Shopify sends your store over automatically, no typing needed.
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
    </div>
  );
}
