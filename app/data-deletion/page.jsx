import Link from "next/link";

export const metadata = { title: "Data Deletion Instructions — Roasify" };

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-[13px] font-semibold text-accent hover:underline">
        ← Back to Roasify
      </Link>

      <h1 className="mb-6 mt-6 font-display text-[26px] font-bold text-navy">
        Data Deletion Instructions
      </h1>

      <div className="space-y-5 text-[13.5px] leading-relaxed text-navy/80">
        <p>There are two ways to remove your data from Roasify, depending on what you need:</p>

        <div>
          <h2 className="mb-1.5 text-[14px] font-bold text-navy">Disconnect a single platform</h2>
          <p>
            Sign in → Connections → click <span className="font-semibold text-navy">Disconnect</span>{" "}
            next to any Shopify store, Meta ad account, or Google Ads account. This immediately
            deletes that connection's stored access token and stops Roasify from reading that
            account. Takes effect instantly.
          </p>
        </div>

        <div>
          <h2 className="mb-1.5 text-[14px] font-bold text-navy">Delete your entire account</h2>
          <p>
            Sign in → Profile → <span className="font-semibold text-navy">Delete my account and data</span>{" "}
            (bottom of the page). This immediately deletes every connection you have across all
            platforms and ends your session. Roasify has no separate account record beyond your
            email and its connections, so this is a complete deletion — there's nothing left behind
            to request removal of afterward.
          </p>
        </div>

        <div>
          <h2 className="mb-1.5 text-[14px] font-bold text-navy">Can't sign in?</h2>
          <p>
            If you can't access your account to use the options above, email the address associated
            with your account and we'll process the deletion manually.
          </p>
        </div>

        <p className="text-[12px] text-text-dim">
          See also our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
