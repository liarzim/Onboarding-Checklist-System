import { NextResponse } from "next/server";
import { verifyGoogleOAuthCode } from "@/lib/google";
import {
  signAdminToken,
  setAdminAuthCookie,
  signVendorToken,
  setVendorAuthCookie,
} from "@/lib/auth";
import { getAuthorizedUser } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback
 * Google OAuth Callback for ALL users (Admin, HR, and Vendors).
 * Reads authenticated email, checks role in Google Sheets, and routes automatically:
 * - Admin/HR -> /admin
 * - Vendor -> /vendor
 * - Unregistered -> / with Hebrew error message
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
    const loginUrl = new URL("/", baseUrl);
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
    const loginUrl = new URL("/", baseUrl);
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

    // 2. First check: Is user an Admin or HR manager?
    const authCheck = await getAuthorizedUser(email);
    if (authCheck.authorized) {
      const role: "Admin" | "HR" = authCheck.role;
      const userDisplayName =
        authCheck.full_name ||
        profile.name ||
        (role === "Admin" ? "מנהל מערכת" : "נציגת משאבי אנוש");

      const token = await signAdminToken({
        user_id: `user_google_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        full_name: userDisplayName,
        email,
        role,
      });

      setAdminAuthCookie(token);

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
        // Continue even if audit fails
      }

      return NextResponse.redirect(new URL("/admin", baseUrl));
    }

    // 3. Second check: Is user a registered Vendor?
    const vendor = await sheetsRepository.getVendorByEmail(email);
    if (vendor) {
      if (!vendor.is_active) {
        const loginUrl = new URL("/", baseUrl);
        loginUrl.searchParams.set(
          "error",
          "חשבון הספק אינו פעיל במערכת. אנא פנה למנהל המערכת לבירור."
        );
        return NextResponse.redirect(loginUrl);
      }

      const token = await signVendorToken({
        vendor_id: vendor.vendor_id,
        company_name: vendor.company_name,
        email: vendor.contact_email,
        role: "Vendor",
      });

      setVendorAuthCookie(token);

      try {
        await sheetsRepository.appendAuditLog({
          log_id: `log_auth_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor_email: email,
          actor_role: "Vendor",
          action_type: "LOGIN_GOOGLE_OAUTH",
          entity_type: "VENDOR_AUTH",
          entity_id: vendor.vendor_id,
          details: `התחברות מוצלחת באמצעות Google OAuth כספק מורשה (${vendor.company_name})`,
        });
      } catch {
        // Continue even if audit fails
      }

      return NextResponse.redirect(new URL("/vendor", baseUrl));
    }

    // 4. Unrecognized email -> redirect to root login page with message
    const loginUrl = new URL("/", baseUrl);
    loginUrl.searchParams.set(
      "error",
      `כתובת האימייל (${email}) אינה רשומה במערכת כספק או כמנהל. יש לפנות למנהל המערכת או להירשם כספק חדש בלשונית ההרשמה.`
    );
    return NextResponse.redirect(loginUrl);
  } catch (err: any) {
    console.error("Google OAuth callback error:", err);
    const loginUrl = new URL("/", baseUrl);
    const errMsg = String(err?.message || "");
    let displayError = `אימות חשבון Google נכשל: ${errMsg || "פג תוקף הקוד"}`;
    if (errMsg.toLowerCase().includes("invalid_client")) {
      const clientIdMasked =
        clientId.length > 15
          ? `${clientId.slice(0, 12)}...${clientId.slice(-10)}`
          : clientId;
      const secretMasked =
        clientSecret.length > 8
          ? `${clientSecret.slice(0, 6)}...${clientSecret.slice(-4)}`
          : clientSecret;
      displayError = `אימות נכשל מול Google (שגיאת invalid_client): נשלח Client ID: [${clientIdMasked}] ו-Secret: [${secretMasked}]. ודא ששני הערכים הללו ב-Vercel שייכים בדיוק לאותו ה-OAuth Client ב-Google Cloud Console.`;
    }
    loginUrl.searchParams.set("error", displayError);
    return NextResponse.redirect(loginUrl);
  }
}
