import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getSheetsClient, getDriveClient } from "@/lib/google";
import {
  extractSpreadsheetId,
  extractDriveFolderId,
  getDynamicGoogleConfig,
} from "@/lib/dynamicConfig";
import { assertAdminRole } from "@/lib/security";
import { syncSystemSettingsToDynamicConfig } from "@/lib/repositories/sheetsRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await assertAdminRole();

    const body = await request.json().catch(() => ({}));
    let env = getEnv();
    let dynamicConfig = getDynamicGoogleConfig();

    let refreshToken =
      (env.GOOGLE_REFRESH_TOKEN || "").trim() ||
      (dynamicConfig.oauth_refresh_token || "").trim();

    if (!refreshToken) {
      await syncSystemSettingsToDynamicConfig();
      env = getEnv();
      dynamicConfig = getDynamicGoogleConfig();
      refreshToken =
        (env.GOOGLE_REFRESH_TOKEN || "").trim() ||
        (dynamicConfig.oauth_refresh_token || "").trim();
    }

    const targetSpreadsheetId = extractSpreadsheetId(
      body.spreadsheetId || dynamicConfig.spreadsheet_id || env.GOOGLE_SPREADSHEET_ID || ""
    );
    const targetDriveFolderId = extractDriveFolderId(
      body.driveFolderId || dynamicConfig.drive_folder_id || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || ""
    );

    const isOauth = Boolean(refreshToken);
    const serviceAccountEmail = dynamicConfig.service_account_email || env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
    const privateKey = dynamicConfig.service_account_private_key || env.GOOGLE_PRIVATE_KEY || "";
    const hasServiceAccount = Boolean(privateKey && privateKey.length > 50);

    const result = {
      credentialsOk: false,
      sheetsOk: false,
      sheetsDetails: "",
      driveOk: false,
      driveDetails: "",
      overallHealthy: false,
    };

    // 1. Verify Credentials (either OAuth or Service Account)
    if (!isOauth && !hasServiceAccount) {
      return NextResponse.json({
        success: false,
        result: {
          ...result,
          credentialsOk: false,
          sheetsDetails: "טרם חובר חשבון Google של האדמין (OAuth) או מפתח Service Account בשרת.",
          driveDetails: "טרם חובר חשבון Google של האדמין (OAuth) או מפתח Service Account בשרת.",
        },
        message: "טרם חובר חשבון Google או מפתח שירות",
      });
    }

    let sheets: ReturnType<typeof getSheetsClient>;
    let drive: ReturnType<typeof getDriveClient>;
    try {
      sheets = getSheetsClient();
      drive = getDriveClient();
      result.credentialsOk = true;
    } catch (authError: any) {
      return NextResponse.json({
        success: false,
        result: {
          ...result,
          credentialsOk: false,
          sheetsDetails: `שגיאת אימות מול Google Cloud: ${authError?.message || "פרטי חיבור לא תקינים"}`,
          driveDetails: `שגיאת אימות מול Google Cloud: ${authError?.message || "פרטי חיבור לא תקינים"}`,
        },
        message: "אימות מול Google Cloud נכשל.",
      });
    }

    // 2. Test Google Sheets Access
    if (!targetSpreadsheetId) {
      result.sheetsOk = false;
      result.sheetsDetails = "טרם הוגדר גיליון. לחץ על 'צור גיליון ותיקייה אוטומטית עכשיו' בשלב 2 למטה.";
    } else {
      try {
        const sheetRes = await sheets.spreadsheets.get({
          spreadsheetId: targetSpreadsheetId,
          fields: "properties.title,sheets.properties.title",
        });
        const title = sheetRes.data.properties?.title || "ללא שם";
        const sheetTabs = (sheetRes.data.sheets || []).map(
          (s) => s.properties?.title || ""
        );
        result.sheetsOk = true;
        result.sheetsDetails = `חובר בהצלחה לגיליון: "${title}" (נמצאו ${sheetTabs.length} לשוניות: ${sheetTabs.slice(0, 5).join(", ")}${sheetTabs.length > 5 ? "..." : ""})`;
      } catch (sheetError: any) {
        result.sheetsOk = false;
        const msg = sheetError?.message || "";
        if (msg.includes("404") || msg.includes("not found")) {
          result.sheetsDetails = isOauth
            ? "הגיליון לא נמצא (404). ודא שמזהה הגיליון (Spreadsheet ID) נכון ושהוא נגיש לחשבונך."
            : `הגיליון לא נמצא (404). ודא שהמזהה תקין ושהגיליון שותף עם חשבון השירות (${serviceAccountEmail}) בהרשאת עורך (Editor).`;
        } else if (
          msg.includes("403") ||
          msg.includes("permission") ||
          msg.includes("The caller does not have permission")
        ) {
          result.sheetsDetails = isOauth
            ? `חוסר הרשאות בגיליון עבור חשבון ${dynamicConfig.oauth_email || "המחובר"}. יש לוודא שהוענקה הרשאת עריכה.`
            : `חוסר הרשאות בגיליון: יש לשתף את כתובת ${serviceAccountEmail} בהרשאת עורך (Editor).`;
        } else {
          result.sheetsDetails = `שגיאה בגישה לגיליון: ${msg}`;
        }
      }
    }

    // 3. Test Google Drive Access
    if (!targetDriveFolderId) {
      result.driveOk = false;
      result.driveDetails = "טרם הוגדרה תיקייה ראשית. לחץ על 'צור גיליון ותיקייה אוטומטית עכשיו' בשלב 2 למטה.";
    } else {
      try {
        const folderRes = await drive.files.get({
          fileId: targetDriveFolderId,
          fields: "id,name,capabilities(canAddChildren)",
          supportsAllDrives: true,
        });

        const folderName = folderRes.data.name || "ללא שם";
        const canAddChildren = Boolean(folderRes.data.capabilities?.canAddChildren);

        if (canAddChildren) {
          result.driveOk = true;
          result.driveDetails = `חובר בהצלחה לתיקייה: "${folderName}" (הרשאות יצירת קבצים ותיקיות מועמדים תקינות)`;
        } else {
          result.driveOk = false;
          result.driveDetails = isOauth
            ? `התיקייה "${folderName}" נמצאה, אך חסרה הרשאת עריכה עבור חשבונך.`
            : `התיקייה "${folderName}" נמצאה, אך חסרה הרשאת עריכה (canAddChildren). יש לשתף את ${serviceAccountEmail} כ-Editor.`;
        }
      } catch (driveError: any) {
        result.driveOk = false;
        const msg = driveError?.message || "";
        if (msg.includes("404") || msg.includes("not found")) {
          result.driveDetails = isOauth
            ? "התיקייה לא נמצאה בדרייב (404). ודא שמזהה התיקייה (Folder ID) נכון ושהיא נגישה לחשבונך."
            : `התיקייה לא נמצאה בדרייב (404). ודא שהמזהה תקין ושהתיקייה שותפה עם חשבון השירות (${serviceAccountEmail}) בהרשאת עורך (Editor).`;
        } else if (
          msg.includes("403") ||
          msg.includes("permission") ||
          msg.includes("The caller does not have permission")
        ) {
          result.driveDetails = isOauth
            ? `חוסר הרשאות בדרייב: ודא שלחשבון ${dynamicConfig.oauth_email || "המחובר"} יש הרשאת עריכה בתיקייה זו.`
            : `חוסר הרשאות בדרייב: יש לשתף את כתובת ${serviceAccountEmail} בהרשאת עורך (Editor) בתיקייה.`;
        } else {
          result.driveDetails = `שגיאה בגישה לדרייב: ${msg}`;
        }
      }
    }

    result.overallHealthy = result.credentialsOk && result.sheetsOk && result.driveOk;

    return NextResponse.json({
      success: true,
      result,
      message: result.overallHealthy
        ? "החיבור ל-Google Sheets ו-Google Drive אומת בהצלחה מלאה"
        : "חלק מהבדיקות לא עברו בהצלחה, ראה פירוט למטה",
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error", message: error?.message || "שגיאה בבדיקת החיבור" },
      { status: 500 }
    );
  }
}
