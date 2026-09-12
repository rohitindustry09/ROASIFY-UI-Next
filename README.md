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

Each of these needs you to register as a developer with the platform before
the redirect will actually work:

- **Shopify** — easiest to start with. Create a custom app in your dev store
  via the Shopify Partner dashboard to get an API key/secret without waiting
  on app review.
- **Meta Ads** — create an app at developers.facebook.com, then request the
  `ads_read` permission via App Review. This can take from days to a couple
  of weeks — start it early.
- **Google Ads** — apply for a developer token in Google Ads API Center, and
  create OAuth credentials in Google Cloud Console. Basic access is granted
  quickly; Standard access (needed once you're live) requires an application.

Once you have credentials for a platform, uncomment the relevant block in
`app/api/connect/[platform]/route.js`, add a matching `callback` route that
exchanges the returned code for tokens, and store those tokens **encrypted**
in a database table keyed to the Supabase user ID. A scheduled job (cron,
Supabase Edge Function, or a queue) should then use those tokens to pull
fresh data on an interval and write it into your own tables — the dashboard
should always read from there, never call the platform APIs directly on
page load.

## Design notes

Dark ink background with a monospace accent for numbers — leans into the
"ledger" feel of a performance-marketing tool, distinct from a generic
light SaaS dashboard. Colors and type scale live in `tailwind.config.js`.
