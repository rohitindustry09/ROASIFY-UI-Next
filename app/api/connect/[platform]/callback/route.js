import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addConnection } from "@/lib/connections";

// Where each platform redirects back to after the user approves access.
// The `code` query param is a one-time authorization code that must be
// exchanged server-side for real tokens -- that exchange is platform-
// specific (different endpoint, payload shape, and response fields for
// Shopify vs Meta vs Google) and isn't implemented yet, since none of the
// three have real developer credentials configured (see README).
//
// The storage side IS implemented: once you have real tokens, saving them
// looks like this (shown for Shopify as an example):
//
//   const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       client_id: process.env.SHOPIFY_API_KEY,
//       client_secret: process.env.SHOPIFY_API_SECRET,
//       code,
//     }),
//   });
//   const { access_token } = await tokenRes.json();
//   await addConnection({
//     userEmail: session.email,
//     platform: "shopify",
//     label: shop,
//     accessToken: access_token, // encrypted automatically before storage
//   });
export async function GET(request, { params }) {
  const { platform } = params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(`${origin}/login`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard/connections/${platform}?error=not-configured`);
  }

  // TODO: exchange `code` for real tokens per-platform, then call
  // addConnection(...) as shown above, then redirect to success below.
  return NextResponse.json(
    { received: true, platform, note: "Token exchange not implemented yet — see comments in this file." },
    { status: 501 }
  );
}
