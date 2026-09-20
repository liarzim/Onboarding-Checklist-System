import { NextResponse } from "next/server";
import { z } from "zod";
import { signAdminToken, setAdminAuthCookie, signVendorToken, setVendorAuthCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isAuthorizedAdminEmail } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { verifyPassword } from "@/lib/password";
import type { AuditLogEntry } from "@/types/schema";

export const dynamic = "force-dynamic";

const UnifiedLoginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // 0. Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`login_unified_${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "יותר מדי ניסיונות התחברות. אנא המתן דקה לפני שתנסה שוב.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = UnifiedLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: parsed.error.issues[0]?.message || "נתוני התחברות שגויים",
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user is an Admin or HR manager
    const isAuthorizedAdmin = await isAuthorizedAdminEmail(normalizedEmail);
    const adminRecord = await sheetsRepository.getAdminByEmail(normalizedEmail);

    if (isAuthorizedAdmin || adminRecord) {
      // Check password if configured
      if (adminRecord && adminRecord.password_hash) {
        if (!password) {
          return NextResponse.json(
            {
              error: "Password required",
              message: "חשבון זה מוגדר עם סיסמה. נא להזין סיסמה.",
            },
            { status: 400 }
          );
        }

        const isValidPassword = await verifyPassword(password, adminRecord.password_hash);
        if (!isValidPassword) {
          return NextResponse.json(
            {
              error: "Invalid credentials",
              message: "סיסמה שגויה",
            },
            { status: 401 }
          );
        }

        if (adminRecord.must_change_password) {
          return NextResponse.json({
            success: true,
            requirePasswordChange: true,
            email: normalizedEmail,
            message: "התחברת עם סיסמה ראשונית. הינך נדרש לעדכן סיסמה אישית כעת.",
          });
        }
      }

      const role = (adminRecord?.role || (isAuthorizedAdmin ? "Admin" : "HR")) as "Admin" | "HR";
      const userDisplayName =
        adminRecord?.full_name ||
        (role === "Admin"
          ? normalizedEmail === "michael.liarzi@gmail.com"
            ? "מיכאל (מנהל ראשי)"
            : "מנהל מערכת"
          : "נציגת משאבי אנוש");

      const token = await signAdminToken({
        user_id: `user_${role.toLowerCase()}_${Date.now()}`,
        full_name: userDisplayName,
        email: normalizedEmail,
        role,
      });

      setAdminAuthCookie(token);

      try {
        await sheetsRepository.appendAuditLog({
          log_id: `log_auth_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor_email: normalizedEmail,
          actor_role: role,
          action_type: "LOGIN_PASSWORD",
          entity_type: "ADMIN_AUTH",
          entity_id: normalizedEmail,
          details: `התחברות מוצלחת במערכת הניהול בתפקיד ${role} (${userDisplayName})`,
        });
      } catch {
        // Continue
      }

      return NextResponse.json({
        success: true,
        role,
        redirectUrl: "/admin",
        user: {
          email: normalizedEmail,
          role,
          fullName: userDisplayName,
        },
      });
    }

    // 2. Check if user is a registered Vendor
    const vendor = await sheetsRepository.getVendorByEmail(normalizedEmail);
    if (vendor) {
      if (!vendor.is_active) {
        return NextResponse.json(
          {
            error: "Vendor inactive",
            message: "חשבון הספק אינו פעיל במערכת. אנא פנה למנהל המערכת לבירור.",
          },
          { status: 403 }
        );
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
          actor_email: normalizedEmail,
          actor_role: "Vendor",
          action_type: "LOGIN_PASSWORD",
          entity_type: "VENDOR_AUTH",
          entity_id: vendor.vendor_id,
          details: `התחברות מוצלחת לפורטל ספקים (${vendor.company_name})`,
        });
      } catch {
        // Continue
      }

      return NextResponse.json({
        success: true,
        role: "Vendor",
        redirectUrl: "/vendor",
        user: {
          email: normalizedEmail,
          role: "Vendor",
          companyName: vendor.company_name,
        },
      });
    }

    // 3. User not found in Admins or Vendors
    return NextResponse.json(
      {
        error: "User not found",
        message:
          "כתובת האימייל אינה רשומה במערכת כספק או כמנהל. נא להירשם כספק חדש או לפנות למנהל המערכת.",
      },
      { status: 404 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בביצוע ההתחברות";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
