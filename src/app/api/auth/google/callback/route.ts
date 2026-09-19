import { NextResponse } from "next/server";
import { verifyGoogleOAuthCode } from "@/lib/google";
import { signAdminToken, setAdminAuthCookie } from "@/lib/auth";
import { isAuthorizedAdminEmail } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback
 * Google redirects here after user signs in.
 * Validates OAuth code, retrieves Google profile, checks admin authorization,
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
        ? "ההתחברות באמצעות חשבון Google בוטלה על ידי המשתמש"
        : "שגיאה בתהליך ההתחברות מול Google"
    );
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. Verify code and fetch user profile from Google using the matching redirectUri
    const profile = await verifyGoogleOAuthCode(code, redirectUri);
    const email = profile.email.toLowerCase().trim();

    // 2. Check if user is an authorized Admin or HR
    const isAdmin = isAuthorizedAdminEmail(email);

    // If not authorized as Admin, role defaults to HR unless strictly restricted
    const role: "Admin" | "HR" = isAdmin ? "Admin" : "HR";

    // 3. Issue signed admin JWT token
    const token = await signAdminToken({
      user_id: `user_google_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
      full_name: profile.name || (isAdmin ? "מנהל מערכת" : "נציגת משאבי אנוש"),
      email,
      role,
    });

    setAdminAuthCookie(token);

    // 4. Log sign-in to AuditLog
    try {
      await sheetsRepository.appendAuditLog({
        log_id: `log_auth_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor_email: email,
        actor_role: role,
        action_type: "LOGIN_GOOGLE_OAUTH",
        entity_type: "ADMIN_AUTH",
        entity_id: email,
        details: `התחברות מוצלחת באמצעות Google OAuth בתפקיד ${role} (${profile.name})`,
      });
    } catch {
      // Don't block login if audit logging fails
    }

    // 5. Redirect to Admin Dashboard
    return NextResponse.redirect(new URL("/admin", baseUrl));
  } catch (err: any) {
    console.error("Google OAuth callback error:", err);
    const loginUrl = new URL("/admin/login", baseUrl);
    loginUrl.searchParams.set("error", "אימות חשבון Google נכשל או שפג תוקף הקוד");
    return NextResponse.redirect(loginUrl);
  }
}
