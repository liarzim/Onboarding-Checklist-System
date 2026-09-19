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
    services.environment = {
      status: "ok",
      details: {
        serviceAccountConfigured: Boolean(envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL),
        spreadsheetConfigured: Boolean(envVars.GOOGLE_SPREADSHEET_ID),
        driveRootConfigured: Boolean(envVars.GOOGLE_DRIVE_ROOT_FOLDER_ID),
      },
    };
  } catch (error) {
    isHealthy = false;
    services.environment = {
      status: "error",
      error: "Environment configuration failure",
    };

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp,
        services,
        error: "Environment configuration failure",
      },
      { status: 500 }
    );
  }

  // 2. Verify Google Sheets Read Access
  try {
    const sheets = getSheetsClient();
    const sheetResponse = await sheets.spreadsheets.get({
      spreadsheetId: envVars.GOOGLE_SPREADSHEET_ID,
      fields: "sheets.properties.title",
    });

    const tabCount = (sheetResponse.data.sheets || []).length;

    services.googleSheets = {
      status: "ok",
      details: {
        connected: true,
        tabCount,
      },
    };
  } catch (error) {
    isHealthy = false;
    services.googleSheets = {
      status: "error",
      error: "Failed to read Google Sheet",
    };
  }

  // 3. Verify Google Drive Capability via metadata check (safe, no file creation)
  try {
    const drive = getDriveClient();

    const folderResponse = await drive.files.get({
      fileId: envVars.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      fields: "id, capabilities(canAddChildren)",
      supportsAllDrives: true,
    });

    const canAddChildren = Boolean(folderResponse.data.capabilities?.canAddChildren);

    services.googleDrive = {
      status: "ok",
      details: {
        connected: true,
        canAddChildren,
      },
    };
  } catch (error) {
    isHealthy = false;
    services.googleDrive = {
      status: "error",
      error: "Failed to verify Google Drive root access",
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
