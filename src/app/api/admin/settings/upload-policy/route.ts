import { NextResponse } from "next/server";
import { z } from "zod";
import { getUploadPolicy, saveUploadPolicy } from "@/lib/uploadPolicy";
import { assertAdminRole } from "@/lib/security";
import { getAdminSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";

export const dynamic = "force-dynamic";

const UploadPolicySchema = z.object({
  passport_photo: z
    .object({
      allowed_extensions: z.array(z.string()).min(1, "נדרשת לפחות סיומת מורשית אחת לתמונת פספורט"),
      max_size_mb: z.number().positive(),
    })
    .optional(),
  id_card: z
    .object({
      allowed_extensions: z.array(z.string()).min(1, "נדרשת לפחות סיומת מורשית אחת לתעודת זהות"),
      max_files: z.number().int().positive(),
      max_size_mb: z.number().positive(),
    })
    .optional(),
});

/**
 * GET /api/admin/settings/upload-policy
 * Returns the current file upload policy and allowed image extensions.
 */
export async function GET() {
  try {
    const policy = getUploadPolicy();
    return NextResponse.json({
      success: true,
      data: policy,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בטעינת מדיניות העלאת קבצים" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings/upload-policy
 * Updates the file upload policy (allowed image extensions, max files, etc.).
 * Restricted strictly to Admin role.
 */
export async function PUT(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const body = await request.json();

    const parsed = UploadPolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "נתוני מדיניות שגויים",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const savedPolicy = saveUploadPolicy(parsed.data);

    let auditDetail = "";
    if (parsed.data.passport_photo && parsed.data.id_card) {
      auditDetail = `עודכנו סיומות לתמונת פספורט (${savedPolicy.passport_photo.allowed_extensions.join(", ")}) והגדרות ת.ז.`;
    } else if (parsed.data.passport_photo) {
      auditDetail = `עודכנו סיומות מורשות לתמונת פספורט: ${savedPolicy.passport_photo.allowed_extensions.join(", ")}`;
    } else if (parsed.data.id_card) {
      auditDetail = `עודכנו הגדרות צילום ת.ז.: סיומות ${savedPolicy.id_card.allowed_extensions.join(", ")}, עד ${savedPolicy.id_card.max_files} קבצים`;
    } else {
      auditDetail = "עודכנה מדיניות קבצים";
    }

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "UPDATE_UPLOAD_POLICY",
      entity_type: "SETTINGS",
      entity_id: "UPLOAD_POLICY",
      details: auditDetail,
    });

    return NextResponse.json({
      success: true,
      message: "המדיניות עודכנה בהצלחה",
      data: savedPolicy,
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error updating upload policy:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בעדכון מדיניות העלאת קבצים" },
      { status: 500 }
    );
  }
}
