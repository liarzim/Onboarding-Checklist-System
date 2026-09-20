import { NextResponse } from "next/server";
import { getEnv, resetEnvCache } from "@/lib/env";
import { resetGoogleClients } from "@/lib/google";
import {
  extractSpreadsheetId,
  extractDriveFolderId,
  saveDynamicGoogleConfig,
} from "@/lib/dynamicConfig";
import { assertAdminRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/google-connection
 * Returns the current Google Cloud connection configuration.
 */
export async function GET() {
  try {
    await assertAdminRole();
    const env = getEnv();

    const spreadsheetId = env.GOOGLE_SPREADSHEET_ID || "";
    const driveFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "";
    const serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
    const isPrivateKeyConfigured = Boolean(env.GOOGLE_PRIVATE_KEY && env.GOOGLE_PRIVATE_KEY.length > 50);

    const spreadsheetUrl = spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      : "";

    const driveFolderUrl = driveFolderId
      ? `https://drive.google.com/drive/folders/${driveFolderId}`
      : "";

    return NextResponse.json({
      success: true,
      data: {
        serviceAccountEmail,
        isPrivateKeyConfigured,
        spreadsheetId,
        driveFolderId,
        spreadsheetUrl,
        driveFolderUrl,
      },
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בשליפת הגדרות חיבור Google" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings/google-connection
 * Updates Google Spreadsheet ID and Drive Root Folder ID.
 */
export async function POST(request: Request) {
  try {
    await assertAdminRole();

    const body = await request.json();
    const rawSpreadsheet = String(body.spreadsheetId || "");
    const rawDriveFolder = String(body.driveFolderId || "");

    const cleanSpreadsheetId = extractSpreadsheetId(rawSpreadsheet);
    const cleanDriveFolderId = extractDriveFolderId(rawDriveFolder);

    // Save to dynamic configuration storage
    saveDynamicGoogleConfig({
      spreadsheet_id: cleanSpreadsheetId,
      drive_folder_id: cleanDriveFolderId,
    });

    // Reset caches so new clients and env reflect the change immediately
    resetEnvCache();
    resetGoogleClients();

    const env = getEnv();

    return NextResponse.json({
      success: true,
      message: "הגדרות החיבור ל-Google Sheets ו-Google Drive נשמרו בהצלחה",
      data: {
        spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
        driveFolderId: env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
        spreadsheetUrl: env.GOOGLE_SPREADSHEET_ID
          ? `https://docs.google.com/spreadsheets/d/${env.GOOGLE_SPREADSHEET_ID}/edit`
          : "",
        driveFolderUrl: env.GOOGLE_DRIVE_ROOT_FOLDER_ID
          ? `https://drive.google.com/drive/folders/${env.GOOGLE_DRIVE_ROOT_FOLDER_ID}`
          : "",
      },
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden", message: "גישה מוגבלת למנהל מערכת בלבד" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error", message: error?.message || "שגיאה בשמירת הגדרות החיבור" },
      { status: 500 }
    );
  }
}
