import { getDb } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/secretCrypto";

const CREDENTIALS_TTL_MS = 60 * 60 * 1000; // an install in flight, not long-term storage

export async function saveShopifyAppCredentials(userEmail, shop, clientId, clientSecret) {
  const { error } = await getDb()
    .from("shopify_app_credentials")
    .upsert(
      {
        user_email: userEmail,
        shop,
        client_id: clientId,
        client_secret_encrypted: await encryptSecret(clientSecret),
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_email,shop" }
    );
  if (error) throw error;
}

// Returns { clientId, clientSecret }, or null if none exist (or they're too old).
export async function getShopifyAppCredentials(userEmail, shop) {
  const { data, error } = await getDb()
    .from("shopify_app_credentials")
    .select("client_id, client_secret_encrypted, created_at")
    .eq("user_email", userEmail)
    .eq("shop", shop)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (Date.now() - new Date(data.created_at).getTime() > CREDENTIALS_TTL_MS) return null;
  return { clientId: data.client_id, clientSecret: await decryptSecret(data.client_secret_encrypted) };
}

// Omit `shop` to delete every pending credential the user has.
export async function deleteShopifyAppCredentials(userEmail, shop) {
  let query = getDb().from("shopify_app_credentials").delete().eq("user_email", userEmail);
  if (shop) query = query.eq("shop", shop);
  const { error } = await query;
  if (error) throw error;
}
