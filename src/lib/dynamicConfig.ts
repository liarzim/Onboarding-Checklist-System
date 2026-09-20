import fs from "fs";
import path from "path";
import os from "os";

export interface DynamicGoogleConfig {
  auth_mode?: "service_account" | "oauth";
  service_account_email?: string;
  service_account_private_key?: string;
  oauth_refresh_token?: string;
  oauth_email?: string;
  spreadsheet_id?: string;
  drive_folder_id?: string;
  updated_at?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __dynamicGoogleConfigCache: DynamicGoogleConfig | undefined;
}

const PRIMARY_CONFIG_PATH = path.join(process.cwd(), "data", "google-config.json");
const FALLBACK_CONFIG_PATH = path.join(os.tmpdir(), "google-config.json");

/**
 * Parses Google Cloud Service Account JSON and extracts client_email and private_key.
 */
export function parseServiceAccountJson(jsonString: string): {
  clientEmail: string;
  privateKey: string;
  projectId?: string;
} {
  const trimmed = (jsonString || "").trim();
  if (!trimmed) {
    throw new Error("תוכן ה-JSON ריק");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("קובץ ה-JSON אינו תקין מבחינה תחבירית");
  }

  const clientEmail = String(parsed.client_email || "").trim();
  let privateKey = String(parsed.private_key || "").trim();

  if (!clientEmail || !clientEmail.includes("@")) {
    throw new Error("לא נמצא שדה client_email תקין ב-JSON");
  }

  if (!privateKey || !privateKey.includes("PRIVATE KEY")) {
    throw new Error("לא נמצא שדה private_key תקין ב-JSON");
  }

  return {
    clientEmail,
    privateKey,
    projectId: parsed.project_id ? String(parsed.project_id).trim() : undefined,
  };
}

/**
 * Extracts Google Spreadsheet ID from raw ID or full Google Sheets URL.
 * Handles formats like:
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";

  // Check if it is a full Google Sheets URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Remove any surrounding quotes or URL query parts
  return trimmed.split(/[?#/]/)[0].replace(/['"]/g, "");
}

/**
 * Extracts Google Drive Folder ID from raw ID or full Google Drive URL.
 * Handles formats like:
 * - 1abcXYZ123_456-789
 * - https://drive.google.com/drive/folders/1abcXYZ123_456-789
 * - https://drive.google.com/drive/u/0/folders/1abcXYZ123_456-789
 */
export function extractDriveFolderId(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";

  // Check if it is a full Google Drive folder URL
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return trimmed.split(/[?#/]/)[0].replace(/['"]/g, "");
}

/**
 * Reads dynamic configuration stored on disk or in serverless memory cache.
 */
export function getDynamicGoogleConfig(): DynamicGoogleConfig {
  let fileConfig: DynamicGoogleConfig = {};

  // 1. Try primary storage (local repo data/ folder)
  try {
    if (fs.existsSync(PRIMARY_CONFIG_PATH)) {
      const content = fs.readFileSync(PRIMARY_CONFIG_PATH, "utf-8");
      fileConfig = JSON.parse(content) as DynamicGoogleConfig;
    }
  } catch {
    // Primary path unreadable or non-existent, try fallback
  }

  // 2. Try fallback storage in os.tmpdir() (used in serverless environments like Vercel)
  if (!fileConfig.oauth_refresh_token && !fileConfig.spreadsheet_id && !fileConfig.service_account_private_key) {
    try {
      if (fs.existsSync(FALLBACK_CONFIG_PATH)) {
        const content = fs.readFileSync(FALLBACK_CONFIG_PATH, "utf-8");
        fileConfig = { ...fileConfig, ...(JSON.parse(content) as DynamicGoogleConfig) };
      }
    } catch {
      // Fallback path unreadable
    }
  }

  // 3. Merge with in-memory global cache
  const memoryConfig = global.__dynamicGoogleConfigCache || {};
  return {
    ...fileConfig,
    ...memoryConfig,
  };
}

/**
 * Persists updated Google configuration to disk with Vercel serverless fallback.
 */
export function saveDynamicGoogleConfig(config: DynamicGoogleConfig): void {
  const current = getDynamicGoogleConfig();
  const updated: DynamicGoogleConfig = {
    ...current,
    ...config,
    updated_at: new Date().toISOString(),
  };

  // Update in-memory cache immediately
  global.__dynamicGoogleConfigCache = updated;

  let savedToFile = false;

  // 1. Try saving to primary data/ directory
  try {
    const dir = path.dirname(PRIMARY_CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PRIMARY_CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    savedToFile = true;
  } catch (primaryErr) {
    console.warn("Primary config path unwritable (expected on Vercel read-only filesystem):", primaryErr);
  }

  // 2. If primary failed or on serverless, write to os.tmpdir()
  if (!savedToFile) {
    try {
      fs.writeFileSync(FALLBACK_CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
      savedToFile = true;
    } catch (fallbackErr) {
      console.warn("Could not save to os.tmpdir():", fallbackErr);
    }
  }
}

