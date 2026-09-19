import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const AddAdminSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  full_name: z.string().min(1, "שם מלא הוא שדה חובה"),
  role: z.enum(["Admin", "HR"]).default("Admin"),
});

/**
 * POST /api/admin/settings/admins
 * Adds or updates an administrator / HR manager.
 * Restricted strictly to Admin role.
 */
export async function POST(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const body = await request.json();

    const parsed = AddAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "נתונים לא תקינים",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { email, full_name, role } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Save admin to sheet
    await sheetsRepository.saveAdmin({
      email: normalizedEmail,
      full_name,
      role,
      added_at: new Date().toISOString(),
    });

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "ADD_ADMIN_USER",
      entity_type: "ADMIN_USER",
      entity_id: normalizedEmail,
      details: `הוסף/עודכן מנהל: ${full_name} (${normalizedEmail}) בתפקיד ${role}`,
    });

    return NextResponse.json({
      success: true,
      message: `המנהל ${full_name} נוסף בהצלחה למערכת`,
      data: { email: normalizedEmail, full_name, role },
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error adding admin:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בהוספת מנהל מערכת" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/settings/admins
 * Removes an administrator by email.
 * Prevents removing the primary admin (michael.liarzi@gmail.com).
 * Restricted strictly to Admin role.
 */
export async function DELETE(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Bad Request", message: "יש לציין כתובת אימייל למחיקה" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Prevent accidental lockout of main administrator
    if (normalizedEmail === "michael.liarzi@gmail.com") {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "לא ניתן למחוק את חשבון המנהל הראשי (michael.liarzi@gmail.com)",
        },
        { status: 403 }
      );
    }

    // Delete from sheet
    await sheetsRepository.deleteAdmin(normalizedEmail);

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "REMOVE_ADMIN_USER",
      entity_type: "ADMIN_USER",
      entity_id: normalizedEmail,
      details: `הוסרה הרשאת ניהול עבור: ${normalizedEmail}`,
    });

    return NextResponse.json({
      success: true,
      message: `הרשאת הניהול עבור ${normalizedEmail} הוסרה בהצלחה`,
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error deleting admin:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה במחיקת מנהל מערכת" },
      { status: 500 }
    );
  }
}
