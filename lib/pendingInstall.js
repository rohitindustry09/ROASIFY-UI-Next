import { signToken, verifyToken } from "@/lib/crypto";
import { encryptSecret, decryptSecret } from "@/lib/secretCrypto";
import { addConnection } from "@/lib/connections";

// A merchant who installs Roasify from inside their Shopify admin may not be
// signed in to Roasify yet. We hold the new token in a short-lived, signed
// httpOnly cookie (token encrypted inside it) and attach it to whichever
// account signs in next, so the install is never lost.
export const PENDING_COOKIE_NAME = "roasify_pending_shopify";
const TOKEN_TYPE = "pending-shopify-install";
const TTL_SECONDS = 60 * 60; // 1 hour

export async function buildPendingInstallCookie({ shop, accessToken, scope }) {
  const value = await signToken(
    { shop, tokenEnc: await encryptSecret(accessToken), scope, exp: Date.now() + TTL_SECONDS * 1000 },
    TOKEN_TYPE
  );
  return {
    name: PENDING_COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TTL_SECONDS,
    },
  };
}

export function clearPendingInstallCookie() {
  return { name: PENDING_COOKIE_NAME, value: "", options: { path: "/", maxAge: 0 } };
}

// Returns true if a pending install was found and attached to `email`.
export async function claimPendingInstall(cookieValue, email) {
  const data = await verifyToken(cookieValue, TOKEN_TYPE);
  if (!data || Date.now() > data.exp) return false;
  await addConnection({
    userEmail: email,
    platform: "shopify",
    label: data.shop,
    accessToken: await decryptSecret(data.tokenEnc),
    meta: { scope: data.scope },
  });
  return true;
}
