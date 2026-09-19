import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signAdminToken, setAdminAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ChangePasswordSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  currentPassword: z.string().min(1, "יש להזין את הסיסמה הנוכחית / הראשונית"),
  newPassword: z.string().min(6, "הסיסמה החדשה חייבת להכיל לפחות 6 תווים"),
});

/**
 * POST /api/auth/admin/change-password
 * Allows a user to change their initial password to a permanent password.
 * Clears the must_change_password flag and issues an active admin session token.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ChangePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: parsed.error.issues[0]?.message || "נתונים שגויים",
        },
        { status: 400 }
      );
    }

    const { email, currentPassword, newPassword } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await sheetsRepository.getAdminByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "משתמש לא נמצא במערכת" },
        { status: 404 }
      );
    }

    // Verify current / initial password if one was set
    if (user.password_hash) {
      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid password", message: "הסיסמה הנוכחית אינה נכונה" },
          { status: 401 }
        );
      }
    }

    // Hash the new permanent password
    const newHash = await hashPassword(newPassword);

    // Update user in Google Sheets
    await sheetsRepository.saveAdmin({
      ...user,
      password_hash: newHash,
      must_change_password: false,
    });

    // Log the change in AuditLogs
    await sheetsRepository.appendAuditLog({
      log_id: `log_pw_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: normalizedEmail,
      actor_role: user.role,
      action_type: "CHANGE_PASSWORD",
      entity_type: "ADMIN_USER",
      entity_id: normalizedEmail,
      details: "הסיסמה הראשונית הוחלפה בהצלחה לסיסמה אישית",
    });

    // Sign active admin session token
    const token = await signAdminToken({
      user_id: `user_${user.role.toLowerCase()}_${Date.now()}`,
      full_name: user.full_name,
      email: normalizedEmail,
      role: user.role,
    });

    setAdminAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "הסיסמה עודכנה בהצלחה! הינך מועבר למערכת.",
      user: {
        email: normalizedEmail,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Server error", message: "שגיאה בעדכון הסיסמה" },
      { status: 500 }
    );
  }
}
