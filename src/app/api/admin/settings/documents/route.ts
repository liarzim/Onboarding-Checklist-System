import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DocumentTypeSchema = z.object({
  doc_type_id: z.string().min(1, "מזהה מסמך הוא שדה חובה"),
  doc_name: z.string().min(1, "שם מסמך הוא שדה חובה"),
  is_required: z.boolean(),
  template_drive_url: z.string().optional().default(""),
  order_index: z.number().int().min(1).optional(),
});

const UpdateDocumentsSchema = z.object({
  documents: z.array(DocumentTypeSchema).min(1, "נדרש לפחות מסמך אחד"),
});

/**
 * PUT /api/admin/settings/documents
 * Updates document types, required status, and template URLs. Logs to Audit_Log.
 * Restricted strictly to Admin role.
 */
export async function PUT(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const body = await request.json();

    const parsed = UpdateDocumentsSchema.safeParse(body);
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

    const { documents } = parsed.data;

    const formattedDocuments = documents.map((doc, idx) => ({
      ...doc,
      order_index: doc.order_index ?? idx + 1,
    }));

    // Save document types to sheet
    await sheetsRepository.saveDocumentTypes(formattedDocuments);

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "UPDATE_DOCUMENTS_SETTINGS",
      entity_type: "SETTINGS",
      entity_id: "DOCUMENTS",
      details: `עודכנו ${documents.length} הגדרות מסמכים ותבניות`,
    });

    return NextResponse.json({
      success: true,
      message: "הגדרות המסמכים עודכנו בהצלחה",
      data: documents,
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error updating setting documents:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בעדכון הגדרות מסמכים" },
      { status: 500 }
    );
  }
}
