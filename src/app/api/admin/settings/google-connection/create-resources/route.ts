import { NextResponse } from "next/server";
import { getDriveClient, getSheetsClient, resetGoogleClients } from "@/lib/google";
import { resetEnvCache } from "@/lib/env";
import {
  saveDynamicGoogleConfig,
  getDynamicGoogleConfig,
} from "@/lib/dynamicConfig";
import { assertAdminRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/settings/google-connection/create-resources
 * Automatically creates:
 * 1. Google Drive Root Folder
 * 2. Google Spreadsheet with all 8 tabs, headers, and initial default data
 * 3. Places spreadsheet inside folder
 * 4. Shares both with the admin's email
 * 5. Updates system dynamic configuration
 */
export async function POST(request: Request) {
  try {
    const adminUser = await assertAdminRole();

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    const shareEmail = (
      body.shareWithEmail ||
      adminUser.email ||
      ""
    ).trim();

    const folderName =
      body.folderName || "מערכת Onboarding - תיקיית קליטה ראשית";
    const spreadsheetTitle =
      body.spreadsheetTitle || "מערכת קליטת מועמדים - נתוני Onboarding";

    const dynamicConfig = getDynamicGoogleConfig();

    // 1. Get Google API clients
    let drive: ReturnType<typeof getDriveClient>;
    let sheets: ReturnType<typeof getSheetsClient>;
    try {
      drive = getDriveClient();
      sheets = getSheetsClient();
    } catch (err: any) {
      return NextResponse.json(
        {
          error: "Google Not Connected",
          message:
            "לא זוהה חשבון Google מחובר. יש לחבר חשבון Google או להזין מפתח חשבון שירות תחילה.",
        },
        { status: 400 }
      );
    }

    // 2. Create Drive Root Folder
    let driveFolderId = "";
    try {
      const folderRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id, name, webViewLink",
      });
      driveFolderId = folderRes.data.id || "";
      if (!driveFolderId) {
        throw new Error("לא התקבל מזהה תיקייה מ-Google Drive");
      }
    } catch (err: any) {
      return NextResponse.json(
        {
          error: "Drive Folder Creation Failed",
          message: `שגיאה ביצירת תיקייה ב-Google Drive: ${err?.message || "ודא שהוענקו הרשאות Drive"}`,
        },
        { status: 500 }
      );
    }

    // 3. Create Google Spreadsheet with all 8 tabs
    let spreadsheetId = "";
    try {
      const createSheetRes = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: spreadsheetTitle,
          },
          sheets: [
            { properties: { title: "Candidates" } },
            { properties: { title: "ChecklistItems" } },
            { properties: { title: "DocumentTypes" } },
            { properties: { title: "SettingStages" } },
            { properties: { title: "Vendors" } },
            { properties: { title: "Projects" } },
            { properties: { title: "Admins" } },
            { properties: { title: "AuditLogs" } },
          ],
        },
      });
      spreadsheetId = createSheetRes.data.spreadsheetId || "";
      if (!spreadsheetId) {
        throw new Error("לא התקבל מזהה גיליון מ-Google Sheets");
      }
    } catch (err: any) {
      return NextResponse.json(
        {
          error: "Spreadsheet Creation Failed",
          message: `שגיאה ביצירת גיליון ב-Google Sheets: ${err?.message || "ודא שהוענקו הרשאות Sheets"}`,
        },
        { status: 500 }
      );
    }

    // 4. Populate headers and default initial data in batches
    try {
      const now = new Date().toISOString();
      const currentAdminEmail = adminUser.email || "admin@example.com";

      const dataPayload = [
        {
          range: "Candidates!A1:P1",
          values: [
            [
              "candidate_id",
              "full_name",
              "id_number",
              "email",
              "phone",
              "vendor_id",
              "project_id",
              "drive_folder_id",
              "current_stage_id",
              "is_completed",
              "created_at",
              "updated_at",
              "access_token",
              "token_expires_at",
              "is_signed_by_candidate",
              "signature_url",
            ],
          ],
        },
        {
          range: "ChecklistItems!A1:H1",
          values: [
            [
              "checklist_item_id",
              "candidate_id",
              "doc_type_id",
              "status",
              "file_name",
              "file_drive_id",
              "file_drive_url",
              "updated_at",
            ],
          ],
        },
        {
          range: "DocumentTypes!A1:E10",
          values: [
            [
              "doc_type_id",
              "doc_name",
              "is_required",
              "template_drive_url",
              "order_index",
            ],
            ["doc_1", "שאלון אישי רמה 5", "TRUE", "", 1],
            ["doc_2", "עלון מידע לנבדק", "TRUE", "", 2],
            ["doc_3", "הצהרה על קבלת כרטיס חכם", "TRUE", "", 3],
            ["doc_4", "הסכמה למסירת מידע פלילי", "TRUE", "", 4],
            ["doc_5", "התחייבות לשמירת סודיות", "TRUE", "", 5],
            ["doc_6", "התחייבות לשמירת פרטיות", "TRUE", "", 6],
            ["doc_7", "הימנעות מעבירות מחשב", "TRUE", "", 7],
            ["doc_8", "הסכמה לניטור סייבר", "TRUE", "", 8],
            ["doc_9", "בקשה להנפקת כרטיס חכם", "TRUE", "", 9],
          ],
        },
        {
          range: "SettingStages!A1:D6",
          values: [
            ["stage_id", "stage_name", "stage_order", "is_terminal"],
            ["stage_1", "איסוף מסמכים ראשוני", 1, "FALSE"],
            ["stage_2", "בדיקת ביטחון שדה", 2, "FALSE"],
            ["stage_3", "אימות מסמכים ומשאבי אנוש", 3, "FALSE"],
            ["stage_4", "מוכן להנפקת כרטיס חכם", 4, "FALSE"],
            ["stage_completed", "הושלם והונפק כרטיס", 5, "TRUE"],
          ],
        },
        {
          range: "Vendors!A1:G1",
          values: [
            [
              "vendor_id",
              "company_name",
              "contact_name",
              "contact_email",
              "is_active",
              "password_hash",
              "must_change_password",
            ],
          ],
        },
        {
          range: "Projects!A1:A5",
          values: [
            ["project_name"],
            ["פרויקט אלפא"],
            ["פרויקט סייבר"],
            ["פרויקט ענן"],
            ["פרויקט תשתיות"],
          ],
        },
        {
          range: "Admins!A1:F2",
          values: [
            [
              "email",
              "full_name",
              "role",
              "added_at",
              "password_hash",
              "must_change_password",
            ],
            [currentAdminEmail, "מנהל מערכת ראשי", "Admin", now, "", "FALSE"],
          ],
        },
        {
          range: "AuditLogs!A1:G2",
          values: [
            [
              "log_id",
              "timestamp",
              "actor_id",
              "actor_name",
              "action",
              "target_id",
              "details",
            ],
            [
              `log_${Date.now()}`,
              now,
              currentAdminEmail,
              "מנהל מערכת",
              "SYSTEM_INIT",
              "Spreadsheet",
              "הקמה אוטומטית של מסד הנתונים ותיקיית המסמכים",
            ],
          ],
        },
      ];

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: dataPayload,
        },
      });
    } catch (err: any) {
      console.warn("Warning during sheet data seeding:", err);
    }

    // 5. Move spreadsheet into the newly created Drive folder
    try {
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: driveFolderId,
        fields: "id, parents",
      });
    } catch (err: any) {
      console.warn("Could not add parent folder to spreadsheet:", err);
    }

    // 6. Share resources with Admin's email (if provided)
    if (shareEmail && shareEmail.includes("@")) {
      try {
        // Share folder
        await drive.permissions.create({
          fileId: driveFolderId,
          requestBody: {
            role: "writer",
            type: "user",
            emailAddress: shareEmail,
          },
          sendNotificationEmail: false,
        });

        // Share spreadsheet
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            role: "writer",
            type: "user",
            emailAddress: shareEmail,
          },
          sendNotificationEmail: false,
        });
      } catch (err: any) {
        console.warn("Permission share warning:", err);
      }
    }

    // 7. Save to dynamic config
    saveDynamicGoogleConfig({
      spreadsheet_id: spreadsheetId,
      drive_folder_id: driveFolderId,
    });

    resetEnvCache();
    resetGoogleClients();

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const driveFolderUrl = `https://drive.google.com/drive/folders/${driveFolderId}`;

    return NextResponse.json({
      success: true,
      message: "הגיליון והתיקייה נוצרו בהצלחה בחשבון Google והוגדרו במערכת!",
      data: {
        spreadsheetId,
        driveFolderId,
        spreadsheetUrl,
        driveFolderUrl,
        sharedWith: shareEmail || null,
      },
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }

    const message =
      error instanceof Error ? error.message : "שגיאה ביצירת משאבי Google";
    return NextResponse.json(
      { error: "Creation Error", message },
      { status: 500 }
    );
  }
}
