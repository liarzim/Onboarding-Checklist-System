import fs from "fs";
import path from "path";
import os from "os";
import type { Candidate, ChecklistItem, AuditLogEntry } from "@/types/schema";

export interface TestStorageData {
  candidates: Candidate[];
  checklistItems: ChecklistItem[];
  auditLogs: AuditLogEntry[];
  deletedCandidateIds?: string[];
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
    deletedCandidateIds: [],
  };
}

export function getDemoCookieCandidates(): Candidate[] {
  if (process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return [];
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { cookies } = require("next/headers");
    const cookieStore = cookies();
    const val = cookieStore.get("demo_candidates")?.value;
    if (val) {
      const decoded = decodeURIComponent(val);
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Expected outside of Next.js server request context or during build
  }
  return [];
}

export function setDemoCandidateCookie(response: any, candidate: Candidate): void {
  if (process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return;
  }
  try {
    const existingList = getDemoCookieCandidates();
    const idx = existingList.findIndex((c) => c.candidate_id === candidate.candidate_id);
    if (idx >= 0) {
      existingList[idx] = { ...existingList[idx], ...candidate };
    } else {
      existingList.unshift(candidate);
    }
    const trimmed = existingList.slice(0, 25);
    response.cookies.set("demo_candidates", encodeURIComponent(JSON.stringify(trimmed)), {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });
  } catch (err) {
    console.warn("Could not set demo_candidates cookie:", err);
  }
}

export function loadTestStore(): TestStorageData {
  if (process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return getInitialTestStorage();
  }
  let store = global.__testStoreMemoryStorage;

  if (!store) {
    // 1. Try reading from primary storage (local project data/ folder)
    try {
      if (fs.existsSync(PRIMARY_STORAGE_PATH)) {
        const content = fs.readFileSync(PRIMARY_STORAGE_PATH, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.candidates)) {
          store = parsed;
        }
      }
    } catch {
      // Primary path unreadable or non-existent
    }

    // 2. Try reading from fallback storage in os.tmpdir() (persists across serverless container invocations)
    if (!store) {
      try {
        if (fs.existsSync(FALLBACK_STORAGE_PATH)) {
          const content = fs.readFileSync(FALLBACK_STORAGE_PATH, "utf-8");
          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.candidates)) {
            store = parsed;
          }
        }
      } catch {
        // Fallback unreadable
      }
    }

    if (!store) {
      store = getInitialTestStorage();
    }
    if (!store.deletedCandidateIds) {
      store.deletedCandidateIds = [];
    }
    global.__testStoreMemoryStorage = store;
  }

  // 3. Always merge with any candidates passed in the browser demo_candidates cookie,
  // BUT strictly reject any candidate that was deleted!
  const cookieCandidates = getDemoCookieCandidates();
  const deletedSet = new Set(store.deletedCandidateIds || []);

  if (cookieCandidates.length > 0) {
    for (const cc of cookieCandidates) {
      if (deletedSet.has(cc.candidate_id)) {
        continue; // NEVER revive deleted candidate from cookie!
      }
      const idx = store.candidates.findIndex((c) => c.candidate_id === cc.candidate_id);
      if (idx >= 0) {
        store.candidates[idx] = {
          ...store.candidates[idx],
          ...cc,
        };
      } else {
        store.candidates.unshift(cc);
      }
    }
  }

  // Extra safety: make sure no deleted candidates remain in store.candidates
  if (deletedSet.size > 0) {
    store.candidates = store.candidates.filter((c) => !deletedSet.has(c.candidate_id));
  }

  return store;
}

export function recordDeletedCandidate(candidateId: string): void {
  const store = loadTestStore();
  if (!store.deletedCandidateIds) {
    store.deletedCandidateIds = [];
  }
  if (!store.deletedCandidateIds.includes(candidateId)) {
    store.deletedCandidateIds.push(candidateId);
  }
  store.candidates = store.candidates.filter((c) => c.candidate_id !== candidateId);
  store.checklistItems = store.checklistItems.filter((i) => !i.checklist_item_id.startsWith(candidateId));
  saveTestStore(store);
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
