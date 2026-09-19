import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UpdateProjectsSchema = z.object({
  projects: z.array(z.string().min(1, "שם פרויקט לא יכול להיות ריק")),
});

/**
 * PUT /api/admin/settings/projects
 * Updates recruitment project catalog. Logs to Audit_Log.
 * Restricted strictly to Admin role.
 */
export async function PUT(request: Request) {
  try {
    await assertAdminRole();
    const session = await getAdminSession();
    const body = await request.json();

    const parsed = UpdateProjectsSchema.safeParse(body);
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

    const { projects } = parsed.data;

    // Save projects to sheet
    await sheetsRepository.saveProjects(projects);

    // Audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: session?.email || "admin@system",
      actor_role: session?.role || "Admin",
      action_type: "UPDATE_PROJECTS_SETTINGS",
      entity_type: "SETTINGS",
      entity_id: "PROJECTS",
      details: `עודכנו ${projects.length} פרויקטי קליטה ומערכות יעד`,
    });

    return NextResponse.json({
      success: true,
      message: "רשימת הפרויקטים עודכנה בהצלחה",
      data: projects,
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error saving projects setting:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בשמירת פרויקטים" },
      { status: 500 }
    );
  }
}
