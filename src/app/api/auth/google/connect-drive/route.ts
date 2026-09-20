import { NextResponse } from "next/server";
import { getGoogleDriveConnectUrl, getOAuth2Credentials } from "@/lib/google";
import { assertAdminRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/connect-drive
 * Initiates the Google OAuth2 flow specifically for connecting Admin's Google Drive and Sheets.
 */
export async function GET(request: Request) {
  try {
    await assertAdminRole();

    const { clientId, clientSecret } = getOAuth2Credentials();
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: "Google OAuth not configured",
          message:
            "GOOGLE_CLIENT_ID או GOOGLE_CLIENT_SECRET אינם מוגדרים בסביבה. יש להגדירם ב-Vercel או ב-.env.local",
        },
        { status: 500 }
      );
    }

    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const redirectUri = `${origin}/api/auth/google/callback`;

    const authUrl = getGoogleDriveConnectUrl(redirectUri, "connect_drive");

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    const message =
      error instanceof Error ? error.message : "שגיאה ביצירת קישור חיבור ל-Google";
    return NextResponse.json(
      { error: "OAuth Connect Error", message },
      { status: 500 }
    );
  }
}
