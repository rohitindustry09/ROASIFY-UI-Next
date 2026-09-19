import { getDb } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/secretCrypto";

// Returns connections WITHOUT decrypted tokens — this is what UI code
// should use. Tokens are only decrypted at the point a sync job actually
// calls the platform's API (not written yet -- see README "Connecting
// platforms"), via getConnectionTokens below.
export async function listConnections(userEmail) {
  const db = getDb();
  const { data, error } = await db
    .from("platform_connections")
    .select("id, platform, label, status, meta, created_at")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function addConnection({ userEmail, platform, label, accessToken, refreshToken, meta = {} }) {
  const db = getDb();
  const row = {
    user_email: userEmail,
    platform,
    label,
    access_token_encrypted: await encryptSecret(accessToken),
    refresh_token_encrypted: refreshToken ? await encryptSecret(refreshToken) : null,
    meta,
  };
  const { data, error } = await db.from("platform_connections").insert(row).select().single();
  if (error) throw error;
  return data;
}

// Scoped to userEmail so one user can never delete another's connection
// even if they guess/enumerate an id.
export async function removeConnection(id, userEmail) {
  const db = getDb();
  const { error } = await db
    .from("platform_connections")
    .delete()
    .eq("id", id)
    .eq("user_email", userEmail);
  if (error) throw error;
}

// Used by the Meta "claim from shared list" flow to filter out ad accounts
// someone has already claimed, regardless of which user claimed them.
export async function getClaimedMetaAccountIds() {
  const db = getDb();
  const { data, error } = await db.from("platform_connections").select("meta").eq("platform", "meta");
  if (error) throw error;
  return new Set(data.map((row) => row.meta?.adAccountId).filter(Boolean));
}

// Used by account deletion -- removes every connection a user has across
// all platforms in one call.
export async function removeAllConnectionsForUser(userEmail) {
  const db = getDb();
  const { error } = await db.from("platform_connections").delete().eq("user_email", userEmail);
  if (error) throw error;
}

// Only call this from the actual data-sync job, never from a request that
// renders UI -- decrypted tokens should never travel further than they
// have to.
export async function getConnectionTokens(id, userEmail) {
  const db = getDb();
  const { data, error } = await db
    .from("platform_connections")
    .select("platform, label, meta, access_token_encrypted, refresh_token_encrypted")
    .eq("id", id)
    .eq("user_email", userEmail)
    .single();
  if (error) throw error;
  return {
    platform: data.platform,
    label: data.label,
    meta: data.meta || {},
    accessToken: await decryptSecret(data.access_token_encrypted),
    refreshToken: data.refresh_token_encrypted ? await decryptSecret(data.refresh_token_encrypted) : null,
  };
}
