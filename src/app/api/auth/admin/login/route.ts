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

    const { email, role: requestedRole, fullName } = parsed.data;
    const { isAuthorizedAdminEmail } = await import("@/lib/security");

    // If the email is a configured admin email, ensure the role is 'Admin'
    const isAdmin = await isAuthorizedAdminEmail(email);
    const role = isAdmin ? "Admin" : requestedRole;

    const token = await signAdminToken({
      user_id: `user_${role.toLowerCase()}_${Date.now()}`,
      full_name:
        fullName ||
        (role === "Admin"
          ? email.toLowerCase() === "michael.liarzi@gmail.com"
            ? "מיכאל (מנהל ראשי)"
            : "מנהל מערכת"
          : "נציגת משאבי אנוש"),
      email: email.toLowerCase(),
      role: role as "HR" | "Admin",
    });

    setAdminAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        email,
        role,
        fullName: fullName || (role === "HR" ? "נציגת משאבי אנוש" : "מנהל מערכת"),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בביצוע ההתחברות";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
