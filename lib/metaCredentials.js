import { getDb } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/secretCrypto";

export async function saveMetaCredentials(userEmail, businessId, systemUserToken) {
  const db = getDb();
  const row = {
    user_email: userEmail,
    business_id: businessId,
    system_user_token_encrypted: await encryptSecret(systemUserToken),
  };
  const { error } = await db.from("meta_credentials").upsert(row, { onConflict: "user_email" });
  if (error) throw error;
}

// Returns null if this user hasn't set up their own Meta credentials yet.
export async function getMetaCredentials(userEmail) {
  const db = getDb();
  const { data, error } = await db
    .from("meta_credentials")
    .select("business_id, system_user_token_encrypted")
    .eq("user_email", userEmail)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    businessId: data.business_id,
    systemUserToken: await decryptSecret(data.system_user_token_encrypted),
  };
}

export async function deleteMetaCredentials(userEmail) {
  const db = getDb();
  const { error } = await db.from("meta_credentials").delete().eq("user_email", userEmail);
  if (error) throw error;
}
