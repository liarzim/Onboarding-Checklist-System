import { NextResponse } from "next/server";
import {
  sheetsRepository,
  DEFAULT_REQUIRED_DOCUMENTS,
  DEFAULT_SETTING_STAGES,
} from "@/lib/repositories/sheetsRepository";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 * Fetches stages, document types, vendors, and recruitment projects.
 * Available to authenticated Admin and HR users.
 */
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session || (session.role !== "Admin" && session.role !== "HR")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למשתמשים מורשים בלבד" },
        { status: 403 }
      );
    }

    const [stages, documentTypes, vendors, projects, admins] = await Promise.all([
      sheetsRepository.getSettingStages().catch(() => DEFAULT_SETTING_STAGES),
      sheetsRepository.getDocumentTypes().catch(() =>
        DEFAULT_REQUIRED_DOCUMENTS.map((d) => ({ ...d, template_drive_url: null }))
      ),
      sheetsRepository.getVendors().catch(() => []),
      sheetsRepository.getProjects().catch(() => [
        "פרויקט אלפא",
        "פרויקט סייבר",
        "פרויקט ענן",
        "פרויקט תשתיות",
      ]),
      sheetsRepository.getAdmins().catch(() => []),
    ]);

    const resolvedStages =
      stages && stages.length > 0 ? stages : DEFAULT_SETTING_STAGES;

    const resolvedDocs =
      documentTypes && documentTypes.length > 0
        ? documentTypes
        : DEFAULT_REQUIRED_DOCUMENTS.map((d) => ({ ...d, template_drive_url: null }));

    const resolvedProjects =
      projects && projects.length > 0
        ? projects
        : ["פרויקט אלפא", "פרויקט סייבר", "פרויקט ענן", "פרויקט תשתיות"];

    return NextResponse.json({
      success: true,
      data: {
        stages: resolvedStages,
        document_types: resolvedDocs,
        vendors: vendors || [],
        projects: resolvedProjects,
        admins: admins || [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin settings:", error);
    // Return fallback defaults so UI never stays empty
    return NextResponse.json({
      success: true,
      data: {
        stages: DEFAULT_SETTING_STAGES,
        document_types: DEFAULT_REQUIRED_DOCUMENTS.map((d) => ({
          ...d,
          template_drive_url: null,
        })),
        vendors: [],
        projects: ["פרויקט אלפא", "פרויקט סייבר", "פרויקט ענן", "פרויקט תשתיות"],
        admins: [],
      },
    });
  }
}
