-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).

create table if not exists platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  platform text not null check (platform in ('shopify', 'meta', 'google')),
  -- Human-readable label for this connection, e.g. the shop domain
  -- ("mystore.myshopify.com") or an ad account name.
  label text not null,
  -- Tokens are encrypted application-side (see lib/secretCrypto.js) before
  -- they ever reach this table, using ENCRYPTION_KEY. Supabase/Postgres
  -- never sees the plaintext token.
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  status text not null default 'connected' check (status in ('connected', 'error')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_connections_user_email_idx
  on platform_connections (user_email);

-- Row Level Security is enabled with no policies, which denies all access
-- by default to any client using the public anon key. Only the service
-- role key (used exclusively in server-side route handlers, never sent to
-- the browser) can read or write this table, since the service role
-- bypasses RLS entirely. This means a leaked anon key can't expose anyone's
-- connections.
alter table platform_connections enable row level security;
