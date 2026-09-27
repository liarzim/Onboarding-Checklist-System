import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";
import { getAdminSession } from "@/lib/auth";
import { DEFAULT_DROPDOWN_OPTIONS } from "@/types/schema";

export const dynamic = "force-dynamic";

const DropdownGroupSchema = z.object({
  label: z.string().min(1),
  options: z.array(z.string().min(1)).min(1, "נדרשת לפחות אפשרות אחת ברשימה"),
});

const UpdateDropdownsSchema = z.object({
  options: z.record(DropdownGroupSchema),
});

/**
 * GET /api/admin/settings/dropdowns
 * Returns dynamic dropdown options for selection fields.
 */
export async function GET() {
  try {
    const options = await sheetsRepository.getDropdownOptions();
    return NextResponse.json({
      success: true,
      data: options && Object.keys(options).length > 0 ? options : DEFAULT_DROPDOWN_OPTIONS,
    });
  } catch (error: any) {
    console.error("Error fetching dropdown options:", error);
    return NextResponse.json({
      success: true,
      data: DEFAULT_DROPDOWN_OPTIONS,
    });
  }
}

/**
 * PUT /api/admin/settings/dropdowns
 * Updates dropdown options. Restricted to Admin.
 */
export async function PUT(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const body = await request.json();

    const parsed = UpdateDropdownsSchema.safeParse(body);
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

    const { options } = parsed.data;
    await sheetsRepository.saveDropdownOptions(options);

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "UPDATE_DROPDOWN_OPTIONS",
      entity_type: "settings",
      entity_id: "dropdown_options",
      details: `עודכנו ${Object.keys(options).length} רשימות בחירה נפתחות`,
    });

    return NextResponse.json({
      success: true,
      data: options,
      message: "רשימות הבחירה עודכנו ונשמרו בהצלחה",
    });
  } catch (error: any) {
    console.error("Error updating dropdown options:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message || "שגיאה בשמירת רשימות בחירה",
      },
      { status: error.status || 500 }
    );
  }
}
