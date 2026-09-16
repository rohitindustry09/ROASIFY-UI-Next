import Link from "next/link";

export const metadata = { title: "Privacy Policy — Roasify" };

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-[13px] font-semibold text-accent hover:underline">
        ← Back to Roasify
      </Link>

      <h1 className="mb-2 mt-6 font-display text-[26px] font-bold text-navy">Privacy Policy</h1>
      <p className="mb-8 text-[12.5px] text-text-dim">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="mb-8 rounded-xl border border-line bg-[#FAFAFB] px-4 py-3 text-[12px] leading-relaxed text-text-dim">
        This page describes what Roasify actually does with your data, in plain language. It is not
        a substitute for legal advice — if you're relying on this for a real business handling
        other people's connected accounts, have a lawyer review it before launch.
      </div>

      <Section title="What we collect">
        <p>When you sign in, we store your email address and a session token — nothing else about you.</p>
        <p>
          When you connect Shopify, Meta Ads, or Google Ads, we store an encrypted access token for
          that connection, plus a human-readable label (like your store domain or ad account name)
          so you can see what's connected. We never see or store your password for any of these
          platforms — that login happens entirely on their own site.
        </p>
        <p>
          If you upload CSV exports instead of connecting an account, those files are processed
          entirely in your browser and stored in your browser's local storage — they are never sent
          to our servers.
        </p>
      </Section>

      <Section title="What we use it for">
        <p>
          Solely to show you your own product-level performance data — merging what Shopify says you
          sold with what Meta and Google say you spent to reach that sale. Nothing here is used for
          advertising, resold, or shared with any other business.
        </p>
      </Section>

      <Section title="How it's protected">
        <p>
          Every OAuth token is encrypted before it's stored, using a separate encryption key from the
          one that signs your session — so a database compromise alone doesn't expose usable
          platform credentials. Only server-side code can ever decrypt them; they're never sent to
          your browser after the initial connection.
        </p>
      </Section>

      <Section title="Third parties involved">
        <p>
          Shopify, Meta, and Google, for the accounts you choose to connect — each governed by their
          own privacy policy for data they hold. Supabase, for database hosting. Your email provider,
          to deliver sign-in codes. None of these receive more access than what's needed to run
          Roasify.
        </p>
      </Section>

      <Section title="Your controls">
        <p>
          Disconnect any platform at any time from the Connections page — this immediately stops
          Roasify from accessing that account and removes the stored token. See{" "}
          <Link href="/data-deletion" className="text-accent hover:underline">
            Data Deletion Instructions
          </Link>{" "}
          for removing your account entirely.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about this policy: reach out via the email associated with your Roasify account.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-7">
      <h2 className="mb-2 text-[15px] font-bold text-navy">{title}</h2>
      <div className="space-y-2.5 text-[13.5px] leading-relaxed text-navy/80">{children}</div>
    </div>
  );
}
