-- Run this in your Supabase SQL Editor (in addition to schema.sql, which
-- you should have already run).

-- Each Roasify user brings their own Meta Business Portfolio + System User
-- token, instead of Roasify having one shared business for everyone. This
-- table holds that, one row per user.
create table if not exists meta_credentials (
  user_email text primary key,
  business_id text not null,
  -- Encrypted the same way OAuth tokens are (see lib/secretCrypto.js) --
  -- Postgres never sees the plaintext token.
  system_user_token_encrypted text not null,
  created_at timestamptz not null default now()
);

alter table meta_credentials enable row level security;
-- Same reasoning as platform_connections in schema.sql: RLS is on with no
-- policies, so only the service-role key (server-side only) can touch this
-- table -- a leaked anon key exposes nothing here.
