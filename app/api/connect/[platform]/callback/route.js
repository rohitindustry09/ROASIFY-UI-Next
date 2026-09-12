import { NextResponse } from "next/server";

// Where each platform redirects back to after the user approves access.
// The `code` query param here is a one-time authorization code — exchange
// it server-side for an access + refresh token, then store those tokens
// encrypted and associated with the current session's user (see
// lib/session.js for reading the logged-in user here via getSession()).
//
// Not implemented yet: this needs the token-exchange call for whichever
// platform it is (each has a different token endpoint and payload shape).
export async function GET(request, { params }) {
  const { platform } = params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard/connections/${platform}?error=not-configured`);
  }

  // TODO: exchange `code` for tokens and persist them, then redirect to
  // /dashboard/connections with a success state instead of this.
  return NextResponse.json(
    { received: true, platform, note: "Token exchange not implemented yet." },
    { status: 501 }
  );
}
