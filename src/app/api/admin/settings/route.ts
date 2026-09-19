import { NextResponse } from "next/server";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { assertAdminRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 * Fetches stages, document types, vendors, and recruitment projects.
 * Restricted strictly to Admin role.
 */
export async function GET() {
  try {
    await assertAdminRole();

    const [stages, documentTypes, vendors, projects] = await Promise.all([
      sheetsRepository.getSettingStages(),
      sheetsRepository.getDocumentTypes(),
      sheetsRepository.getVendors(),
      sheetsRepository.getProjects(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stages,
        document_types: documentTypes,
        vendors,
        projects,
      },
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    console.error("Error fetching admin settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בטעינת הגדרות מערכת" },
      { status: 500 }
    );
  }
}
