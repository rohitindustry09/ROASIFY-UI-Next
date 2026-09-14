import { createClient } from "@supabase/supabase-js";

let client = null;

// Service-role client: bypasses Row Level Security entirely, so this must
// only ever be imported in server-side code (route handlers, Server
// Components) -- never in a "use client" file, and the key it uses
// (SUPABASE_SERVICE_ROLE_KEY) must never be prefixed NEXT_PUBLIC_.
export function getDb() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in .env.local");
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
