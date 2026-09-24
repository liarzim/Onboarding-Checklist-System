import fs from "fs";
import path from "path";
import os from "os";
import type { Candidate, ChecklistItem, AuditLogEntry } from "@/types/schema";

export interface TestStorageData {
  candidates: Candidate[];
  checklistItems: ChecklistItem[];
  auditLogs: AuditLogEntry[];
}

declare global {
  // eslint-disable-next-line no-var
  var __testStoreMemoryStorage: TestStorageData | undefined;
}

const PRIMARY_STORAGE_PATH = path.join(process.cwd(), "data", "test-store.json");
const FALLBACK_STORAGE_PATH = path.join(os.tmpdir(), "onboarding-test-store.json");

const PRIMARY_UPLOADS_DIR = path.join(process.cwd(), "data", "test-uploads");
const FALLBACK_UPLOADS_DIR = path.join(os.tmpdir(), "onboarding-test-uploads");

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

export function loadTestStore(): TestStorageData {
  if (global.__testStoreMemoryStorage) {
    return global.__testStoreMemoryStorage;
  }

  // 1. Try reading from primary storage (local project data/ folder)
  try {
    if (fs.existsSync(PRIMARY_STORAGE_PATH)) {
      const content = fs.readFileSync(PRIMARY_STORAGE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.candidates)) {
        global.__testStoreMemoryStorage = parsed;
        return parsed;
      }
    }
  } catch {
    // Primary path unreadable or non-existent
  }

  // 2. Try reading from fallback storage in os.tmpdir() (persists across serverless container invocations)
  try {
    if (fs.existsSync(FALLBACK_STORAGE_PATH)) {
      const content = fs.readFileSync(FALLBACK_STORAGE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.candidates)) {
        global.__testStoreMemoryStorage = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback unreadable
  }

  global.__testStoreMemoryStorage = getInitialTestStorage();
  return global.__testStoreMemoryStorage;
}

export function saveTestStore(data: TestStorageData): void {
  global.__testStoreMemoryStorage = data;

  // 1. Try saving to primary data/ directory
  try {
    ensureDir(path.dirname(PRIMARY_STORAGE_PATH));
    fs.writeFileSync(PRIMARY_STORAGE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Primary path unwritable (expected on Vercel read-only filesystem)
  }

  // 2. Always write to fallback os.tmpdir() to survive serverless environments
  try {
    ensureDir(path.dirname(FALLBACK_STORAGE_PATH));
    fs.writeFileSync(FALLBACK_STORAGE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write test store to os.tmpdir():", err);
  }
}

/**
 * Resets all test storage and uploaded test files back to State 0.
 */
export function resetTestStoreToStateZero(): void {
  global.__testStoreMemoryStorage = getInitialTestStorage();

  // Clean primary
  try {
    if (fs.existsSync(PRIMARY_STORAGE_PATH)) {
      fs.unlinkSync(PRIMARY_STORAGE_PATH);
    }
  } catch (err) {
    console.warn("Could not remove primary test store file:", err);
  }

  try {
    if (fs.existsSync(PRIMARY_UPLOADS_DIR)) {
      fs.rmSync(PRIMARY_UPLOADS_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn("Could not remove primary test uploads folder:", err);
  }

  // Clean fallback
  try {
    if (fs.existsSync(FALLBACK_STORAGE_PATH)) {
      fs.unlinkSync(FALLBACK_STORAGE_PATH);
    }
  } catch (err) {
    console.warn("Could not remove fallback test store file:", err);
  }

  try {
    if (fs.existsSync(FALLBACK_UPLOADS_DIR)) {
      fs.rmSync(FALLBACK_UPLOADS_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn("Could not remove fallback test uploads folder:", err);
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
  let targetDir = path.join(PRIMARY_UPLOADS_DIR, folderId);
  try {
    ensureDir(targetDir);
    fs.writeFileSync(path.join(targetDir, fileName), buffer);
  } catch {
    // Fallback to os.tmpdir() for serverless runtimes
    targetDir = path.join(FALLBACK_UPLOADS_DIR, folderId);
    ensureDir(targetDir);
    fs.writeFileSync(path.join(targetDir, fileName), buffer);
  }

  const fileId = `local_test_file_${Date.now()}`;
  return {
    fileId,
    webViewLink: `#local-upload-${encodeURIComponent(fileName)}`,
  };
}
