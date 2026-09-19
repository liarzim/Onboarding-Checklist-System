import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google
 * Initiates the Google OAuth2 flow by redirecting the user to Google's consent screen.
 */
export async function GET(request: Request) {
  try {
    const env = getEnv();
    const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        {
          error: "Google OAuth not configured",
          message:
            "GOOGLE_CLIENT_ID אינו מוגדר בסביבה. יש להגדיר GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET בקובץ .env.local",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const callbackRedirect = searchParams.get("redirect") || "/admin";

    // Build auth URL
    const authUrl = getGoogleAuthUrl();

    // Store intended redirect if needed or redirect straight to Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה ביצירת קישור הזדהות עם Google";
    return NextResponse.json({ error: "OAuth Error", message }, { status: 500 });
  }
}
