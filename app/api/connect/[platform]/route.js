import { NextResponse } from "next/server";

// This route starts each platform's OAuth flow. It needs real developer
// credentials before it will work — see README.md "Connecting platforms".
//
// Flow for all three is the same shape:
//   1. Redirect the user to the platform's authorize URL with your client ID
//   2. Platform redirects back to /api/connect/[platform]/callback with a code
//   3. Exchange that code server-side for an access + refresh token
//   4. Store the tokens encrypted, associated with this user, in your database
//   5. A background job uses the stored tokens to sync data on a schedule
export async function GET(request, { params }) {
  const { platform } = params;
  const site = process.env.NEXT_PUBLIC_SITE_URL;

  switch (platform) {
    case "shopify": {
      // Shopify's OAuth needs the shop's domain up front — in a real build,
      // collect it with a small form ("yourstore.myshopify.com") before
      // redirecting here. Placeholder shown below.
      // const shop = request.nextUrl.searchParams.get("shop");
      // const authorizeUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=read_orders,read_products&redirect_uri=${site}/api/connect/shopify/callback`;
      return NextResponse.json(
        { error: "Shopify OAuth not configured yet — add SHOPIFY_API_KEY and the shop domain form." },
        { status: 501 }
      );
    }

    case "meta": {
      // const authorizeUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${site}/api/connect/meta/callback&scope=ads_read`;
      return NextResponse.json(
        { error: "Meta OAuth not configured yet — add META_APP_ID and complete App Review for ads_read." },
        { status: 501 }
      );
    }

    case "google": {
      // const authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_ADS_CLIENT_ID}&redirect_uri=${site}/api/connect/google/callback&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;
      return NextResponse.json(
        { error: "Google Ads OAuth not configured yet — add GOOGLE_ADS_CLIENT_ID and a developer token." },
        { status: 501 }
      );
    }

    default:
      return NextResponse.json({ error: "Unknown platform" }, { status: 404 });
  }
}
