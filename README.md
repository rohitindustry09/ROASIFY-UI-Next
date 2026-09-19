# Roasify (Next.js, local session auth)

Passwordless login (email + one-time code) with a signed cookie session — no
external auth provider required yet — plus a dashboard shell for connecting
Shopify, Meta Ads, and Google Ads.

**Current auth is a local dev stand-in, not production-ready as-is:**
the OTP code is generated and stored in an in-memory `Map` (`lib/otpStore.js`)
that resets on every server restart and won't work across multiple server
instances, and there's no real email sender wired up — the code is logged to
the server console and, outside production, returned directly in the API
response so the login screen can show it in a "dev mode" banner. Swap in a
real email provider (Resend, Postmark, etc.) and a shared store (Redis,
Postgres) before this goes live with real users. Google sign-in is present
in the UI but disabled — it needs a registered OAuth app and either
Supabase Auth or a library like Auth.js before it does anything.

## What's here

- `app/login` — the auth screen. Email + 6-digit code, no password. There's
  no separate signup form: entering a new email and verifying the code
  creates the session the same way, which is standard for passwordless auth.
- `lib/session.js` — signs and verifies the session cookie with Web Crypto
  (works in both middleware's Edge runtime and normal route handlers).
- `lib/otpStore.js` — the in-memory OTP store described above.
- `app/api/auth/otp`, `.../otp/verify`, `.../logout` — the three auth routes.
- `middleware.js` — reads the session cookie on every request and redirects
  signed-out users away from `/dashboard`, and signed-in users away from `/login`.
- `app/dashboard` — sidebar shell, overview (empty state until data exists),
  and `/dashboard/connections` with a card per platform.
- `app/api/connect/[platform]` — stub OAuth-start routes for Shopify, Meta,
  and Google Ads. These return a 501 until you add real credentials (below).

## Run it

```bash
npm install
cp .env.local.example .env.local
# Add a random value for SESSION_SECRET, e.g.:
openssl rand -base64 32
npm run dev
```

Visit `localhost:3000` — you'll land on `/login`. Enter any email, and the
code will appear right in the UI (dev mode only) since no email sender is
configured yet.

## Why the platform env vars exist, even though users connect dynamically

`META_APP_ID`, `GOOGLE_ADS_CLIENT_ID`, `SHOPIFY_API_KEY`, etc. are **your
app's** identity with each platform, not any individual user's. OAuth always
needs two identities: the user's account (dynamic — any shop, any ad
account, chosen at click time) and the app's own registered identity (static
— issued once when you register a developer app with that platform). Every
"Sign in with Google" button on the internet works this way: the website has
one Google Client ID, and any of Google's users can sign in through it. These
three env var sets are that ID, for Meta, Google Ads, and Shopify. You still
only set each one up once, and it works for every user who connects — nothing
about the per-user, dynamic connection flow requires more than that.

## Database (for saved platform connections)

Connections/Profile now read from a real Postgres table instead of always
showing "not connected" — this is what makes connecting more than one store
per platform actually persist across page loads and devices.

1. Create a project at supabase.com (free tier is fine).
2. Open the SQL Editor and run `supabase/schema.sql` from this repo, then
   also run `supabase/002_meta_credentials.sql` (needed for users to save
   their own Meta Business credentials — see "Connecting platforms" below).
3. Settings -> API -> copy the Project URL and the **service_role** key
   (not the anon/public key) into `.env.local` as `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`.
4. Generate `ENCRYPTION_KEY` with `openssl rand -base64 32` and add it too.

**Why the service role key and not the anon key:** the service role key
bypasses Row Level Security entirely, which is intentional here — this app
only ever talks to Supabase from server-side route handlers (never the
browser), and every query is manually scoped to `user_email` from the
signed-in session in `lib/connections.js`. The anon key is never used or
needed. Never prefix this key `NEXT_PUBLIC_` or it ships to every browser.

**Tokens are encrypted before they reach the database** (`lib/secretCrypto.js`,
AES-GCM, keyed by `ENCRYPTION_KEY`) — a database leak alone doesn't expose
usable OAuth tokens.

I can't verify actual connectivity to Supabase's servers from my sandbox
(same network restriction that blocked testing real Gmail sending earlier)
— the code path is right, but test the real round-trip once you've got a
project set up.

## Connecting platforms

Click **Connect** on `/dashboard/connections` or `/dashboard/profile` (both
show the same cards) to go to `/dashboard/connections/[platform]`, a page
that explains what's being requested and — for Shopify — asks for the store
domain. Submitting redirects to the platform's real OAuth screen, which will
offer to continue with whatever account is already signed in on that
platform in the user's browser (this is standard OAuth behavior, not
anything Roasify has to implement). Right now that redirect only fires once
the matching env var is set — otherwise the page redirects back with an
inline "not configured yet" message instead of a raw error.

**On Shopify specifically:** unlike Google, Shopify has no single account
that owns multiple stores — every store is a separate tenant with its own
OAuth endpoint, so there's no way to skip asking for the store domain from
an app-initiated "Connect" flow. Every real Shopify analytics tool (Triple
Whale, Polar Analytics, etc.) asks for it the same way. The one way to skip
it is the merchant installing from inside their own Shopify admin (via an
App Store listing or direct install link) instead of clicking Connect from
within Roasify — Shopify supplies the shop automatically in that case,
since the merchant is already there (see `/api/connect/shopify/install`).

**On Meta specifically — this one works differently from the other two, and
differently from a typical multi-tenant setup.** There's no single Roasify-
wide Meta app or Business Portfolio. Each signed-in user enters their own
Business ID and System User token directly in the app (Connections → Meta
ads), saved encrypted per-user (`meta_credentials` table). Once saved,
Roasify lists every ad account shared with *that user's own* Business
Portfolio — their own clients, if they're running Roasify as an agency —
and each one gets an "Analyze" button. No Meta login inside Roasify at all;
sellers share their account from their own Meta Business Settings instead.

This is a deliberate tradeoff over per-user OAuth: no `META_APP_ID`/App
Review process for you to run at all, since each user brings their own
already-approved Meta setup. The cost is that setting up a System User
token is a more involved first step for each user than a one-click OAuth
login — worth it specifically because it avoids you needing Meta App
Review and Business Verification altogether, which is what made the
earlier per-user-OAuth-through-Roasify's-own-app version slow to get live.

Setup, per platform:

- **Shopify** — easiest to start with. Create a custom app in your dev store
  via the Shopify Partner dashboard to get an API key/secret without waiting
  on app review.
- **Google Ads** — apply for a developer token in Google Ads API Center, and
  create OAuth credentials in Google Cloud Console. Basic access is granted
  quickly; Standard access (needed once you're live) requires an application.
- **Meta Ads** — nothing for you to set up. Each user does this themselves,
  inside the app: create a Business Portfolio at business.facebook.com if
  they don't have one, a Business-type app at developers.facebook.com with
  the Marketing API use case, then in Business Settings → Users → System
  Users: create a System User, assign their app, and generate a token with
  `ads_read` scope set to never expire. Their Business ID is in Business
  Settings → Business Info. They paste both into Roasify once.

A scheduled job (cron, Supabase Edge Function, or a queue) should use the
stored tokens to pull fresh data on an interval and write it into your own
tables — the dashboard should always read from there, never call the
platform APIs directly on page load. The "View data" pages currently fetch
live on each visit as a simpler starting point; swap that for a real sync
job before this handles meaningful traffic.

## Design notes

Dark ink background with a monospace accent for numbers — leans into the
"ledger" feel of a performance-marketing tool, distinct from a generic
light SaaS dashboard. Colors and type scale live in `tailwind.config.js`.
