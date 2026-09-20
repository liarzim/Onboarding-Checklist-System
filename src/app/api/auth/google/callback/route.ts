import { NextResponse } from "next/server";
import { verifyGoogleOAuthCode } from "@/lib/google";
import { signAdminToken, setAdminAuthCookie } from "@/lib/auth";
import { getAuthorizedUser } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback
 * Google redirects here after user signs in.
 * Validates OAuth code, retrieves Google profile, checks user authorization,
 * issues admin session cookie, and logs to Audit_Log.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = host ? `${proto}://${host}` : url.origin;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (error || !code) {
    const loginUrl = new URL("/admin/login", baseUrl);
    loginUrl.searchParams.set(
      "error",
      error === "access_denied"
        ? "ההתחברות באמצעות חשבון Google בוטלה או שהמשתמש אינו מוגדר כמשתמש בדיקה (Test User) ב-Google Console"
        : `שגיאה בתהליך ההתחברות מול Google: ${error || "חסר קוד אימות"}`
    );
    return NextResponse.redirect(loginUrl);
  }

  const { getOAuth2Credentials } = await import("@/lib/google");
  const { clientId, clientSecret } = getOAuth2Credentials();
  if (!clientId || !clientSecret) {
    const missing = [!clientId && "GOOGLE_CLIENT_ID", !clientSecret && "GOOGLE_CLIENT_SECRET"]
      .filter(Boolean)
      .join(" ו-");
    const loginUrl = new URL("/admin/login", baseUrl);
    loginUrl.searchParams.set(
      "error",
      `משתנה סביבה חסר ב-Vercel (${missing}). יש לוודא שסומנו כל הסביבות (Production, Preview) ב-Vercel ולבצע Redeploy.`
    );
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. Verify code and fetch user profile from Google using matching redirectUri
    const profile = await verifyGoogleOAuthCode(code, redirectUri);
    const email = profile.email.toLowerCase().trim();

    // 2. Check authorization status in Admins sheet or environment list
    const authCheck = await getAuthorizedUser(email);
    if (!authCheck.authorized) {
      const loginUrl = new URL("/admin/login", baseUrl);
      loginUrl.searchParams.set(
        "error",
        `כתובת האימייל (${email}) אינה מורשית במערכת. יש לפנות למנהל המערכת להוספת הרשאה.`
      );
      return NextResponse.redirect(loginUrl);
    }

    const role: "Admin" | "HR" = authCheck.role;
    const userDisplayName =
      authCheck.full_name ||
      profile.name ||
      (role === "Admin" ? "מנהל מערכת" : "נציגת משאבי אנוש");

    // 3. Issue signed admin JWT token
    const token = await signAdminToken({
      user_id: `user_google_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
      full_name: userDisplayName,
      email,
      role,
    });

    setAdminAuthCookie(token);

    // 4. Log sign-in to AuditLog (fail-safe)
    try {
      await sheetsRepository.appendAuditLog({
        log_id: `log_auth_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor_email: email,
        actor_role: role,
        action_type: "LOGIN_GOOGLE_OAUTH",
        entity_type: "ADMIN_AUTH",
        entity_id: email,
        details: `התחברות מוצלחת באמצעות Google OAuth בתפקיד ${role} (${userDisplayName})`,
      });
    } catch {
      // Don't block login if audit logging fails
    }

    // 5. Redirect to Admin Dashboard
    return NextResponse.redirect(new URL("/admin", baseUrl));
  } catch (err: any) {
    console.error("Google OAuth callback error:", err);
    const loginUrl = new URL("/admin/login", baseUrl);
    const errMsg = String(err?.message || "");
    let displayError = `אימות חשבון Google נכשל: ${errMsg || "פג תוקף הקוד"}`;
    if (errMsg.toLowerCase().includes("invalid_client")) {
      displayError =
        "אימות נכשל (invalid_client): ה-Client Secret אינו תואם ל-Client ID או שהמשתנה אינו מוגדר עבור סביבת Preview ב-Vercel.";
    }
    loginUrl.searchParams.set("error", displayError);
    return NextResponse.redirect(loginUrl);
  }
}
