-- Run in the Supabase SQL Editor after schema.sql and 002_meta_credentials.sql.

-- One-time sign-in codes. Kept server-side so a code is single-use, guesses
-- can be limited and sends can be rate-limited -- none of which a signed
-- cookie can enforce. Only a keyed hash of the code is stored, never the code.
create table if not exists otp_challenges (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  last_sent_at timestamptz not null default now(),
  window_start timestamptz not null default now(),
  send_count int not null default 1
);

alter table otp_challenges enable row level security;
-- No policies: only the server-side service-role key can touch this table.
