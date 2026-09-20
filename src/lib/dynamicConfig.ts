import fs from "fs";
import path from "path";

export interface DynamicGoogleConfig {
  spreadsheet_id?: string;
  drive_folder_id?: string;
  updated_at?: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "google-config.json");

/**
 * Extracts Google Spreadsheet ID from raw ID or full Google Sheets URL.
 * Handles formats like:
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";

  // Check if it's a full Google Sheets URL
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

  // Check if it's a full Google Drive folder URL
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return trimmed.split(/[?#/]/)[0].replace(/['"]/g, "");
}

/**
 * Reads dynamic configuration stored on disk (if present).
 */
export function getDynamicGoogleConfig(): DynamicGoogleConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      return JSON.parse(content) as DynamicGoogleConfig;
    }
  } catch (error) {
    console.warn("Could not read dynamic Google config from disk:", error);
  }
  return {};
}

/**
 * Persists updated Google configuration to disk.
 */
export function saveDynamicGoogleConfig(config: DynamicGoogleConfig): void {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const current = getDynamicGoogleConfig();
    const updated: DynamicGoogleConfig = {
      ...current,
      ...config,
      updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updated, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save dynamic Google config to disk:", error);
    throw new Error("שגיאה בשמירת הגדרות החיבור לקובץ התצורה");
  }
}
