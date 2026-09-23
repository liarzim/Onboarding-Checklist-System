import fs from "fs";
import path from "path";
import type { Candidate, ChecklistItem, AuditLogEntry, Vendor, AdminUser } from "@/types/schema";

export interface TestStorageData {
  candidates: Candidate[];
  checklistItems: ChecklistItem[];
  auditLogs: AuditLogEntry[];
}

const STORAGE_PATH = path.join(process.cwd(), "data", "test-store.json");
const UPLOADS_DIR = path.join(process.cwd(), "data", "test-uploads");

function ensureDir(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {
    // Ignore error
  }
}

export function getInitialTestStorage(): TestStorageData {
  return {
    candidates: [],
    checklistItems: [],
    auditLogs: [],
  };
}

let memoryStorage: TestStorageData | null = null;

export function loadTestStore(): TestStorageData {
  if (memoryStorage) {
    return memoryStorage;
  }

  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const content = fs.readFileSync(STORAGE_PATH, "utf-8");
      memoryStorage = JSON.parse(content);
      return memoryStorage!;
    }
  } catch (err) {
    console.warn("Could not read test store file, initializing empty:", err);
  }

  memoryStorage = getInitialTestStorage();
  return memoryStorage;
}

export function saveTestStore(data: TestStorageData): void {
  memoryStorage = data;
  try {
    ensureDir(path.dirname(STORAGE_PATH));
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write test store file:", err);
  }
}

/**
 * Resets all test storage and uploaded test files back to State 0.
 */
export function resetTestStoreToStateZero(): void {
  memoryStorage = getInitialTestStorage();
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      fs.unlinkSync(STORAGE_PATH);
    }
  } catch (err) {
    console.warn("Could not remove test store file:", err);
  }

  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      fs.rmSync(UPLOADS_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn("Could not remove test uploads folder:", err);
  }
}

/**
 * Saves a local test upload file when Google Drive is unavailable.
 */
export function saveLocalTestUpload(
  folderId: string,
  fileName: string,
  buffer: Buffer
): { fileId: string; webViewLink: string } {
  const targetDir = path.join(UPLOADS_DIR, folderId);
  ensureDir(targetDir);
  const filePath = path.join(targetDir, fileName);
  fs.writeFileSync(filePath, buffer);

  const fileId = `local_test_file_${Date.now()}`;
  return {
    fileId,
    webViewLink: `#local-upload-${encodeURIComponent(fileName)}`,
  };
}
