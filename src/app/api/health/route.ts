import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getSheetsClient, getDriveClient } from "@/lib/google";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

interface ServiceHealth {
  status: "ok" | "error";
  details?: Record<string, unknown>;
  error?: string;
}

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();

  // Rate limiting to prevent DoS on health check and Google API quotas
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`health_${clientIp}`, {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        status: "error",
        message: "Too Many Requests",
      },
      { status: 429 }
    );
  }

  const services: {
    environment: ServiceHealth;
    googleSheets: ServiceHealth;
    googleDrive: ServiceHealth;
  } = {
    environment: { status: "error" },
    googleSheets: { status: "error" },
    googleDrive: { status: "error" },
  };

  let isHealthy = true;

  // 1. Validate Environment Variables (without exposing internal secrets/emails)
  let envVars: ReturnType<typeof getEnv>;
  try {
    envVars = getEnv();
    const sheetId = envVars.GOOGLE_SPREADSHEET_ID || "";
    const driveId = envVars.GOOGLE_DRIVE_ROOT_FOLDER_ID || "";
    const saEmail = envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";

    services.environment = {
      status: "ok",
      details: {
        vercelEnv: process.env.VERCEL_ENV || "local",
        serviceAccountConfigured: Boolean(saEmail),
        serviceAccountEmail: saEmail,
        spreadsheetConfigured: Boolean(sheetId),
        spreadsheetIdPreview: sheetId.length > 8 ? `${sheetId.slice(0, 5)}...${sheetId.slice(-5)}` : (sheetId ? "set" : "not_set"),
        driveRootConfigured: Boolean(driveId),
        driveFolderIdPreview: driveId.length > 8 ? `${driveId.slice(0, 5)}...${driveId.slice(-5)}` : (driveId ? "set" : "not_set"),
      },
    };
  } catch (error: any) {
    isHealthy = false;
    services.environment = {
      status: "error",
      error: error?.message || "Environment configuration failure",
    };

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp,
        services,
        error: error?.message || "Environment configuration failure",
      },
      { status: 500 }
    );
  }

  // 2. Verify Google Sheets Read Access
  try {
    const sheets = getSheetsClient();
    const sheetResponse = await sheets.spreadsheets.get({
      spreadsheetId: envVars.GOOGLE_SPREADSHEET_ID,
      fields: "properties.title,sheets.properties.title",
    });

    const sheetTitle = sheetResponse.data.properties?.title || "גיליון ללא שם";
    const tabCount = (sheetResponse.data.sheets || []).length;
    const tabNames = (sheetResponse.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);

    services.googleSheets = {
      status: "ok",
      details: {
        connected: true,
        sheetTitle,
        tabCount,
        tabNames,
      },
    };
  } catch (error: any) {
    isHealthy = false;
    services.googleSheets = {
      status: "error",
      error: error?.message || "Failed to read Google Sheet",
    };
  }

  // 3. Verify Google Drive Capability via metadata check (safe, no file creation)
  try {
    const drive = getDriveClient();

    const folderResponse = await drive.files.get({
      fileId: envVars.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      fields: "id, name, capabilities(canAddChildren)",
      supportsAllDrives: true,
    });

    const folderName = folderResponse.data.name || "תיקייה ללא שם";
    const canAddChildren = Boolean(folderResponse.data.capabilities?.canAddChildren);

    services.googleDrive = {
      status: "ok",
      details: {
        connected: true,
        folderName,
        canAddChildren,
      },
    };
  } catch (error: any) {
    isHealthy = false;
    services.googleDrive = {
      status: "error",
      error: error?.message || "Failed to verify Google Drive root access",
    };
  }

  const statusCode = isHealthy ? 200 : 500;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp,
      services,
    },
    { status: statusCode }
  );
}
