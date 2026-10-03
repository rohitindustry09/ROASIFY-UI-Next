-- Run in the Supabase SQL Editor after the earlier migrations.

-- A store that isn't a development store can't install the shared Roasify
-- app, so its owner may bring their own Shopify app (client ID + secret).
-- These are held only while the install is in flight: the OAuth callback
-- deletes the row as soon as it has exchanged the code for a token, and rows
-- older than an hour are ignored. The secret is encrypted application-side.
create table if not exists shopify_app_credentials (
  user_email text not null,
  shop text not null,
  client_id text not null,
  client_secret_encrypted text not null,
  created_at timestamptz not null default now(),
  primary key (user_email, shop)
);

alter table shopify_app_credentials enable row level security;
-- No policies: only the server-side service-role key can touch this table.
