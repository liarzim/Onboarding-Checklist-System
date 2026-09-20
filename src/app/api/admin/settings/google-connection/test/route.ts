import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getEnv } from "@/lib/env";
import { extractSpreadsheetId, extractDriveFolderId } from "@/lib/dynamicConfig";
import { assertAdminRole } from "@/lib/security";

export const dynamic = "force-dynamic";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

export async function POST(request: Request) {
  try {
    await assertAdminRole();

    const body = await request.json().catch(() => ({}));
    const env = getEnv();

    const targetSpreadsheetId = extractSpreadsheetId(
      body.spreadsheetId || env.GOOGLE_SPREADSHEET_ID || ""
    );
    const targetDriveFolderId = extractDriveFolderId(
      body.driveFolderId || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || ""
    );

    const serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = env.GOOGLE_PRIVATE_KEY;

    const result = {
      credentialsOk: false,
      sheetsOk: false,
      sheetsDetails: "",
      driveOk: false,
      driveDetails: "",
      overallHealthy: false,
    };

    // 1. Verify Service Account Credentials
    if (!serviceAccountEmail || !privateKey || privateKey.length < 50) {
      return NextResponse.json({
        success: false,
        result: {
          ...result,
          credentialsOk: false,
          sheetsDetails: "מפתח הפרטי של ה-Service Account אינו מוגדר כראוי בשרת.",
          driveDetails: "מפתח הפרטי של ה-Service Account אינו מוגדר כראוי בשרת.",
        },
        message: "פרטי ה-Service Account אינם מוגדרים במלואם",
      });
    }

    let authClient: InstanceType<typeof google.auth.JWT>;
    try {
      authClient = new google.auth.JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: GOOGLE_SCOPES,
      });
      await authClient.authorize();
      result.credentialsOk = true;
    } catch (authError: any) {
      return NextResponse.json({
        success: false,
        result: {
          ...result,
          credentialsOk: false,
          sheetsDetails: `שגיאת אימות מול Google Cloud: ${authError?.message || "פרטי מפתח לא תקינים"}`,
          driveDetails: `שגיאת אימות מול Google Cloud: ${authError?.message || "פרטי מפתח לא תקינים"}`,
        },
        message: "אימות מול Google Cloud נכשל. ודא כי קובץ המפתח והאימייל תקינים.",
      });
    }

    const sheets = google.sheets({ version: "v4", auth: authClient });
    const drive = google.drive({ version: "v3", auth: authClient });

    // 2. Test Google Sheets Access
    if (!targetSpreadsheetId) {
      result.sheetsOk = false;
      result.sheetsDetails = "טרם הוגדר Spreadsheet ID";
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
        result.sheetsDetails = `חובר בהצלחה: "${title}" (נמצאו ${sheetTabs.length} לשוניות: ${sheetTabs.slice(0, 5).join(", ")}${sheetTabs.length > 5 ? "..." : ""})`;
      } catch (sheetError: any) {
        result.sheetsOk = false;
        const msg = sheetError?.message || "";
        if (msg.includes("404") || msg.includes("not found")) {
          result.sheetsDetails = "הגיליון לא נמצא. בדוק את ה-Spreadsheet ID וודא ששיתפת את ה-Service Account כ-Editor.";
        } else if (msg.includes("403") || msg.includes("permission") || msg.includes("The caller does not have permission")) {
          result.sheetsDetails = `חוסר הרשאות בגיליון: יש לשתף את כתובת ${serviceAccountEmail} בהרשאת עורך (Editor) בגיליון.`;
        } else {
          result.sheetsDetails = `שגיאה בגישה לגיליון: ${msg}`;
        }
      }
    }

    // 3. Test Google Drive Access
    if (!targetDriveFolderId) {
      result.driveOk = false;
      result.driveDetails = "טרם הוגדר Folder ID לתיקיית השורש";
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
          result.driveDetails = `התיקייה "${folderName}" נמצאה, אך חסרה הרשאת עריכה (canAddChildren). יש לשתף את ${serviceAccountEmail} כ-Editor.`;
        }
      } catch (driveError: any) {
        result.driveOk = false;
        const msg = driveError?.message || "";
        if (msg.includes("404") || msg.includes("not found")) {
          result.driveDetails = "התיקייה לא נמצאה בדרייב. בדוק את ה-Folder ID וודא ששיתפת את ה-Service Account כ-Editor.";
        } else if (msg.includes("403") || msg.includes("permission") || msg.includes("The caller does not have permission")) {
          result.driveDetails = `חוסר הרשאות בדרייב: יש לשתף את כתובת ${serviceAccountEmail} בהרשאת עורך (Editor) בתיקייה.`;
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
