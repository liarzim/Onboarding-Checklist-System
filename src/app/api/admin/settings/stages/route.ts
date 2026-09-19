import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const StageSchema = z.object({
  stage_id: z.string().min(1, "מזהה שלב הוא שדה חובה"),
  stage_name: z.string().min(1, "שם שלב הוא שדה חובה"),
  stage_order: z.number().int().min(1),
  is_terminal: z.boolean(),
});

const UpdateStagesSchema = z.object({
  stages: z.array(StageSchema).min(1, "נדרש לפחות שלב אחד"),
});

/**
 * PUT /api/admin/settings/stages
 * Updates stages order, names, and terminal flags. Logs to Audit_Log.
 * Restricted strictly to Admin role.
 */
export async function PUT(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const body = await request.json();

    const parsed = UpdateStagesSchema.safeParse(body);
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

    const { stages } = parsed.data;

    // Save stages to sheet
    await sheetsRepository.saveSettingStages(stages);

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "UPDATE_STAGES_SETTINGS",
      entity_type: "SETTINGS",
      entity_id: "STAGES",
      details: `עודכנו ${stages.length} שלבי תהליך קליטה`,
    });

    return NextResponse.json({
      success: true,
      message: "שלבי התהליך עודכנו בהצלחה",
      data: stages,
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error updating setting stages:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בעדכון שלבי התהליך" },
      { status: 500 }
    );
  }
}
