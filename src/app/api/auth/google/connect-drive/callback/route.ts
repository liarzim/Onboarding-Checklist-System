import { NextResponse } from "next/server";
import { exchangeCodeForDriveTokens, resetGoogleClients } from "@/lib/google";
import { resetEnvCache } from "@/lib/env";
import {
  getDynamicGoogleConfig,
  saveDynamicGoogleConfig,
} from "@/lib/dynamicConfig";
import { assertAdminRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/connect-drive/callback
 * Handles OAuth callback when connecting Admin's Google Drive & Sheets.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = host ? `${proto}://${host}` : url.origin;
  const redirectUri = `${baseUrl}/api/auth/google/connect-drive/callback`;

  const settingsUrl = new URL("/admin/settings", baseUrl);

  if (error || !code) {
    settingsUrl.searchParams.set(
      "googleError",
      error === "access_denied"
        ? "חיבור חשבון Google בוטל על ידי המשתמש"
        : `שגיאה באימות מול Google: ${error || "קוד אימות חסר"}`
    );
    return NextResponse.redirect(settingsUrl);
  }

  try {
    // Verify admin identity
    await assertAdminRole();

    const tokenData = await exchangeCodeForDriveTokens(code, redirectUri);
    const email = tokenData.email.toLowerCase().trim();

    const currentConfig = getDynamicGoogleConfig();
    const refreshToken =
      tokenData.refreshToken || currentConfig.oauth_refresh_token || "";

    saveDynamicGoogleConfig({
      auth_mode: "oauth",
      oauth_refresh_token: refreshToken,
      oauth_email: email,
    });

    resetEnvCache();
    resetGoogleClients();

    settingsUrl.searchParams.set("googleSuccess", `חשבון Google (${email}) חובר בהצלחה`);
    return NextResponse.redirect(settingsUrl);
  } catch (err: any) {
    const message =
      err instanceof Error ? err.message : "שגיאה לא צפויה בשמירת חיבור Google";
    settingsUrl.searchParams.set("googleError", message);
    return NextResponse.redirect(settingsUrl);
  }
}
