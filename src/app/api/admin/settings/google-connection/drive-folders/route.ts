import { NextResponse } from "next/server";
import { getDriveClient } from "@/lib/google";
import { assertAdminRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/google-connection/drive-folders
 * Returns a list of existing folders in the connected Google Drive
 * so the admin can pick where to create the main folder and sheet.
 */
export async function GET() {
  try {
    await assertAdminRole();

    let drive: ReturnType<typeof getDriveClient>;
    try {
      drive = getDriveClient();
    } catch {
      return NextResponse.json({
        success: false,
        folders: [],
        message: "Google Drive אינו מחובר כעת",
      });
    }

    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      pageSize: 50,
      orderBy: "modifiedTime desc",
      fields: "files(id, name, modifiedTime)",
    });

    const folders = (res.data.files || []).map((f) => ({
      id: f.id || "",
      name: f.name || "תיקייה ללא שם",
    }));

    return NextResponse.json({
      success: true,
      folders,
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    return NextResponse.json({
      success: false,
      folders: [],
      message: error?.message || "שגיאה בטעינת תיקיות מ-Google Drive",
    });
  }
}
