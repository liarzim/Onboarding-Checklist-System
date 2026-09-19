import { NextResponse } from "next/server";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit-log
 * Retrieves audit log records with optional filtering.
 * Restricted strictly to Admin role.
 */
export async function GET(request: Request) {
  try {
    await assertAdminRole();

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("from_date") || undefined;
    const dateTo = searchParams.get("to_date") || undefined;
    const actionType = searchParams.get("action") || undefined;
    const actorEmail = searchParams.get("actor_email") || undefined;

    const logs = await sheetsRepository.getAuditLogs({
      dateFrom,
      dateTo,
      actionType,
      actorEmail,
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בטעינת יומן פעולות" },
      { status: 500 }
    );
  }
}
