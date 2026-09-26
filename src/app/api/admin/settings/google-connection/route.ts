import { NextResponse } from "next/server";
import { getEnv, resetEnvCache } from "@/lib/env";
import { resetGoogleClients } from "@/lib/google";
import {
  extractSpreadsheetId,
  extractDriveFolderId,
  saveDynamicGoogleConfig,
  getDynamicGoogleConfig,
  setCookieGoogleConfig,
  parseServiceAccountJson,
} from "@/lib/dynamicConfig";
import { assertAdminRole } from "@/lib/security";
import {
  sheetsRepository,
  syncSystemSettingsToDynamicConfig,
} from "@/lib/repositories/sheetsRepository";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/google-connection
 * Returns the current Google Cloud connection configuration.
 */
export async function GET() {
  try {
    await assertAdminRole();
    const env = getEnv();
    const dynamicConfig = getDynamicGoogleConfig();

    let refreshToken =
      (env.GOOGLE_REFRESH_TOKEN || "").trim() ||
      (dynamicConfig.oauth_refresh_token || "").trim();

    // If refresh token is missing in memory, try loading from Google Sheets SystemSettings tab
    if (!refreshToken) {
      await syncSystemSettingsToDynamicConfig();
    }

    const updatedConfig = getDynamicGoogleConfig();
    const updatedEnv = getEnv();
    const finalRefreshToken =
      (updatedEnv.GOOGLE_REFRESH_TOKEN || "").trim() ||
      (updatedConfig.oauth_refresh_token || "").trim();

    const authMode = finalRefreshToken
      ? "oauth"
      : updatedConfig.auth_mode || "service_account";
    const spreadsheetId = updatedEnv.GOOGLE_SPREADSHEET_ID || "";
    const driveFolderId = updatedEnv.GOOGLE_DRIVE_ROOT_FOLDER_ID || "";

    const serviceAccountEmail =
      updatedConfig.service_account_email ||
      updatedEnv.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      "";

    const isPrivateKeyConfigured = Boolean(
      updatedConfig.service_account_private_key ||
        (updatedEnv.GOOGLE_PRIVATE_KEY && updatedEnv.GOOGLE_PRIVATE_KEY.length > 50)
    );

    const isOauthConnected = Boolean(finalRefreshToken);
    const oauthEmail = updatedConfig.oauth_email || "";
    const isPermanentEnvConfigured = Boolean(
      process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_REFRESH_TOKEN.trim().length > 5
    );

    const spreadsheetUrl = spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      : "";

    const driveFolderUrl = driveFolderId
      ? `https://drive.google.com/drive/folders/${driveFolderId}`
      : "";

    const response = NextResponse.json({
      success: true,
      data: {
        authMode,
        serviceAccountEmail,
        isPrivateKeyConfigured,
        isOauthConnected,
        oauthEmail,
        oauthRefreshToken: finalRefreshToken,
        isPermanentEnvConfigured,
        spreadsheetId,
        driveFolderId,
        spreadsheetUrl,
        driveFolderUrl,
      },
    });

    if (spreadsheetId || driveFolderId) {
      setCookieGoogleConfig(response, {
        ...updatedConfig,
        spreadsheet_id: spreadsheetId,
        drive_folder_id: driveFolderId,
      });
    }

    return response;
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
 * Updates Google Connection settings: IDs, Service Account credentials, or OAuth mode.
 */
export async function POST(request: Request) {
  try {
    await assertAdminRole();

    const body = await request.json();
    const updates: Parameters<typeof saveDynamicGoogleConfig>[0] = {};

    // 1. If Service Account JSON is provided, parse and save credentials
    if (body.serviceAccountJson && typeof body.serviceAccountJson === "string") {
      const parsed = parseServiceAccountJson(body.serviceAccountJson);
      updates.service_account_email = parsed.clientEmail;
      updates.service_account_private_key = parsed.privateKey;
      updates.auth_mode = "service_account";
    }

    // 2. Direct Service Account Email / Private Key
    if (body.serviceAccountEmail !== undefined) {
      updates.service_account_email = String(body.serviceAccountEmail).trim();
      updates.auth_mode = "service_account";
    }
    if (body.serviceAccountPrivateKey !== undefined) {
      updates.service_account_private_key = String(body.serviceAccountPrivateKey).trim();
      updates.auth_mode = "service_account";
    }

    // 3. Switch auth mode or disconnect OAuth
    if (body.authMode === "oauth" || body.authMode === "service_account") {
      updates.auth_mode = body.authMode;
    }
    if (body.disconnectOauth) {
      updates.oauth_refresh_token = "";
      updates.oauth_email = "";
      updates.auth_mode = "service_account";
      await sheetsRepository.setSystemSetting("oauth_refresh_token", "");
      await sheetsRepository.setSystemSetting("oauth_email", "");
      await sheetsRepository.setSystemSetting("auth_mode", "service_account");
    }

    // 4. Update OAuth Refresh Token directly if provided
    if (body.oauthRefreshToken !== undefined) {
      updates.oauth_refresh_token = String(body.oauthRefreshToken).trim();
      updates.auth_mode = "oauth";
      if (updates.oauth_refresh_token) {
        await sheetsRepository.setSystemSetting("oauth_refresh_token", updates.oauth_refresh_token);
        await sheetsRepository.setSystemSetting("auth_mode", "oauth");
      }
    }

    // 5. Update Spreadsheet and Folder IDs if provided
    if (body.spreadsheetId !== undefined) {
      updates.spreadsheet_id = extractSpreadsheetId(String(body.spreadsheetId));
    }
    if (body.driveFolderId !== undefined) {
      updates.drive_folder_id = extractDriveFolderId(String(body.driveFolderId));
      if (updates.drive_folder_id) {
        await sheetsRepository.setSystemSetting("drive_folder_id", updates.drive_folder_id);
      }
    }

    // Save to dynamic configuration storage
    saveDynamicGoogleConfig(updates);

    // Reset caches so new clients and env reflect the change immediately
    resetEnvCache();
    resetGoogleClients();

    const env = getEnv();
    const dynamicConfig = getDynamicGoogleConfig();
    const finalRefreshToken =
      (env.GOOGLE_REFRESH_TOKEN || "").trim() ||
      (dynamicConfig.oauth_refresh_token || "").trim();

    const response = NextResponse.json({
      success: true,
      message: "הגדרות החיבור ל-Google עודכנו בהצלחה",
      data: {
        authMode: finalRefreshToken ? "oauth" : dynamicConfig.auth_mode || "service_account",
        serviceAccountEmail:
          dynamicConfig.service_account_email ||
          env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
          "",
        isPrivateKeyConfigured: Boolean(
          dynamicConfig.service_account_private_key ||
            (env.GOOGLE_PRIVATE_KEY && env.GOOGLE_PRIVATE_KEY.length > 50)
        ),
        isOauthConnected: Boolean(finalRefreshToken),
        oauthEmail: dynamicConfig.oauth_email || "",
        oauthRefreshToken: finalRefreshToken,
        isPermanentEnvConfigured: Boolean(
          process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_REFRESH_TOKEN.trim().length > 5
        ),
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

    setCookieGoogleConfig(response, {
      ...dynamicConfig,
      spreadsheet_id: env.GOOGLE_SPREADSHEET_ID,
      drive_folder_id: env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    });

    return response;
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
