# Roasify (Next.js + Supabase)

Login/signup with Google OAuth or passwordless email OTP, plus a dashboard shell
for connecting Shopify, Meta Ads, and Google Ads.

## What's here

- `app/login` — the auth screen. "Continue with Google" or email + 6-digit code.
  There's no separate signup form: both paths create an account automatically
  the first time, which is standard for passwordless auth.
- `app/auth/callback` — where Google sends the user back after consent.
- `middleware.js` — refreshes the session on every request and redirects
  signed-out users away from `/dashboard`.
- `app/dashboard` — sidebar shell, overview (empty state until data exists),
  and `/dashboard/connections` with a card per platform.
- `app/api/connect/[platform]` — stub OAuth-start routes for Shopify, Meta,
  and Google Ads. These return a 501 until you add real credentials (below).

## 1. Set up Supabase

1. Create a project at supabase.com.
2. In **Authentication > Providers**, enable **Google** and paste your Google
   OAuth client ID/secret (create one in Google Cloud Console > Credentials,
   with `https://YOUR-PROJECT.supabase.co/auth/v1/callback` as the redirect URI).
3. **Email OTP** is on by default — under **Authentication > Email Templates**,
   confirm the "Magic Link" template is set to send a code, not just a link.
4. Copy your project URL and anon key into `.env.local` (copy from
   `.env.local.example`).

## 2. Run it

```bash
npm install
npm run dev
```

Visit `localhost:3000` — you'll land on `/login`.

## 3. Connecting platforms (next step, not yet wired up)

Each of these needs you to register as a developer with the platform before
the "Connect" buttons in `/dashboard/connections` will do anything real:

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
