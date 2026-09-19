import { NextResponse } from "next/server";
import { z } from "zod";
import { signAdminToken, setAdminAuthCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const AdminLoginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().optional(),
  role: z.enum(["HR", "Admin"]).default("HR"),
  fullName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // 0. Rate limiting to prevent brute force on administrative logins
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`login_admin_${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "יותר מדי ניסיונות התחברות למערכת הניהול. אנא המתן דקה.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = AdminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: parsed.error.issues[0]?.message || "קלט שגוי",
        },
        { status: 400 }
      );
    }

    const { email, password, role: requestedRole, fullName } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const { isAuthorizedAdminEmail } = await import("@/lib/security");
    const { sheetsRepository } = await import("@/lib/repositories/sheetsRepository");
    const { verifyPassword } = await import("@/lib/password");

    // 1. Check if user is registered in system or env
    const isAuthorized = await isAuthorizedAdminEmail(normalizedEmail);
    const adminRecord = await sheetsRepository.getAdminByEmail(normalizedEmail);

    if (!isAuthorized && !adminRecord) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "כתובת האימייל אינה מורשית במערכת. אנא פנה למנהל המערכת.",
        },
        { status: 403 }
      );
    }

    // 2. If password is provided, verify password hash if user has password set
    if (adminRecord && adminRecord.password_hash) {
      if (!password) {
        return NextResponse.json(
          {
            error: "Password required",
            message: "משתמש זה מוגדר עם סיסמה. יש להזין סיסמה.",
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

      // Check if user must change their initial password
      if (adminRecord.must_change_password) {
        return NextResponse.json({
          success: true,
          requirePasswordChange: true,
          email: normalizedEmail,
          message: "התחברת עם סיסמה ראשונית. הינך נדרש לעדכן סיסמה אישית כעת.",
        });
      }
    }

    const role = (adminRecord?.role || (isAuthorized ? "Admin" : requestedRole)) as "Admin" | "HR";
    const userDisplayName =
      fullName ||
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

    return NextResponse.json({
      success: true,
      requirePasswordChange: false,
      user: {
        email: normalizedEmail,
        role,
        fullName: userDisplayName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בביצוע ההתחברות";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
