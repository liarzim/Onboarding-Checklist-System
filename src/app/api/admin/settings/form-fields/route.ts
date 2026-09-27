import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";
import { getAdminSession } from "@/lib/auth";
import { DEFAULT_FORM_FIELD_SETTINGS } from "@/types/schema";

export const dynamic = "force-dynamic";

const FormFieldItemSchema = z.object({
  doc_type_id: z.string().min(1),
  field_key: z.string().min(1),
  field_label: z.string().min(1),
  section: z.string().min(1),
  is_required: z.boolean(),
});

const UpdateFormFieldsSchema = z.object({
  settings: z.array(FormFieldItemSchema).min(1, "נדרשת לפחות הגדרת שדה אחת"),
});

/**
 * GET /api/admin/settings/form-fields
 * Returns required/optional settings for document form fields.
 */
export async function GET() {
  try {
    const settings = await sheetsRepository.getFormFieldSettings();
    return NextResponse.json({
      success: true,
      data: settings && settings.length > 0 ? settings : DEFAULT_FORM_FIELD_SETTINGS,
    });
  } catch (error: any) {
    console.error("Error fetching form field settings:", error);
    return NextResponse.json({
      success: true,
      data: DEFAULT_FORM_FIELD_SETTINGS,
    });
  }
}

/**
 * PUT /api/admin/settings/form-fields
 * Updates required/optional flags for form fields. Restricted to Admin.
 */
export async function PUT(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const body = await request.json();

    const parsed = UpdateFormFieldsSchema.safeParse(body);
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

    const { settings } = parsed.data;
    await sheetsRepository.saveFormFieldSettings(settings);

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "UPDATE_FORM_FIELD_SETTINGS",
      entity_type: "settings",
      entity_id: "form_field_settings",
      details: `עודכנו ${settings.length} הגדרות שדות חובה ורשות בטפסים`,
    });

    return NextResponse.json({
      success: true,
      data: settings,
      message: "הגדרות שדות הטפסים נשמרו בהצלחה",
    });
  } catch (error: any) {
    console.error("Error updating form field settings:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message || "שגיאה בשמירת הגדרות שדות",
      },
      { status: error.status || 500 }
    );
  }
}
