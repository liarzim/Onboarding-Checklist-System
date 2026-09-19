import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VendorSchema = z.object({
  vendor_id: z.string().min(1, "מזהה ספק הוא שדה חובה"),
  company_name: z.string().min(1, "שם חברה הוא שדה חובה"),
  contact_name: z.string().min(1, "שם איש קשר הוא שדה חובה"),
  contact_email: z.string().email("כתובת אימייל לא תקינה"),
  is_active: z.boolean(),
});

/**
 * POST /api/admin/settings/vendors
 * Creates or updates vendor profiles. Logs to Audit_Log.
 * Restricted strictly to Admin role.
 */
export async function POST(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const body = await request.json();

    const parsed = VendorSchema.safeParse(body);
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

    const vendor = parsed.data;

    // Save vendor to sheet
    await sheetsRepository.saveVendor(vendor);

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "UPSERT_VENDOR_SETTINGS",
      entity_type: "VENDOR",
      entity_id: vendor.vendor_id,
      details: `עודכן ספק: ${vendor.company_name} (${vendor.vendor_id}), פעיל: ${vendor.is_active}`,
    });

    return NextResponse.json({
      success: true,
      message: "פרטי הספק נשמרו בהצלחה",
      data: vendor,
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error saving vendor setting:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בשמירת פרטי ספק" },
      { status: 500 }
    );
  }
}
