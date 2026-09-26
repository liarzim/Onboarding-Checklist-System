import { Readable } from "stream";
import fs from "fs";
import path from "path";
import os from "os";
import { getDriveClient } from "./google";
import { getEnv } from "./env";
import { saveLocalTestUpload } from "./testStore";
import { extractDriveFolderId, getDynamicGoogleConfig } from "./dynamicConfig";
import { syncSystemSettingsToDynamicConfig } from "./repositories/sheetsRepository";

/**
 * Ensures Google credentials and OAuth refresh token are synchronized from Google Sheets
 * if not present in memory or environment variables, avoiding Service Account Drive quota limits.
 */
async function ensureAuthReady(): Promise<void> {
  const env = getEnv();
  const config = getDynamicGoogleConfig();
  if (!env.GOOGLE_REFRESH_TOKEN && !config.oauth_refresh_token) {
    await syncSystemSettingsToDynamicConfig();
  }
}

/**
 * Creates a dedicated candidate folder under the root onboarding Drive folder.
 * Folder name format: [candidateId] - [candidateName]
 */
export async function createCandidateFolder(
  candidateName: string,
  candidateId: string
): Promise<string> {
  await ensureAuthReady();

  // Sanitize candidateName and candidateId to prevent injection in naming
  const safeName = candidateName.replace(/[/\\:*?"<>|]/g, "").trim();
  const safeId = candidateId.replace(/[/\\:*?"<>|]/g, "").trim();
  const folderName = `${safeId} - ${safeName}`;

  try {
    const drive = getDriveClient();
    const env = getEnv();

    const requestBody: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    const rootFolderId = extractDriveFolderId((env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim());
    if (
      rootFolderId &&
      rootFolderId !== "your_google_drive_folder_id_here" &&
      rootFolderId.length > 5
    ) {
      requestBody.parents = [rootFolderId];
    }

    const response = await drive.files.create({
      requestBody,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    const folderId = response.data.id;
    if (!folderId) {
      throw new Error(`Drive folder creation succeeded but no ID was returned for candidate ${candidateId}`);
    }

    return folderId;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`Drive folder creation error for "${folderName}":`, error);

    const env = getEnv();
    const isConfigured = Boolean(
      (env.GOOGLE_PRIVATE_KEY && env.GOOGLE_PRIVATE_KEY.length > 50) ||
      (env.GOOGLE_DRIVE_ROOT_FOLDER_ID && env.GOOGLE_DRIVE_ROOT_FOLDER_ID !== "your_google_drive_folder_id_here")
    );

    // If Google Drive is configured (like in Staging/Production on Vercel), do NOT swallow the error!
    if (isConfigured) {
      throw new Error(`שגיאה ביצירת תיקיית Drive עבור המועמד: ${errorMsg}`);
    }

    return `test_drive_folder_${safeId}`;
  }
}

/**
 * Ensures a candidate has a valid, existing Google Drive folder.
 * If folderId is missing, test, or invalid, searches or creates a new folder.
 */
export async function ensureCandidateFolder(
  candidateName: string,
  candidateId: string,
  existingFolderId?: string | null
): Promise<string> {
  await ensureAuthReady();
  const env = getEnv();
  const isDriveConfigured = Boolean(
    (env.GOOGLE_PRIVATE_KEY && env.GOOGLE_PRIVATE_KEY.length > 50) ||
    (env.GOOGLE_DRIVE_ROOT_FOLDER_ID && env.GOOGLE_DRIVE_ROOT_FOLDER_ID !== "your_google_drive_folder_id_here")
  );

  if (!isDriveConfigured) {
    const safeId = candidateId.replace(/[/\\:*?"<>|]/g, "").trim();
    return existingFolderId || `test_drive_folder_${safeId}`;
  }

  const drive = getDriveClient();
  const rootFolderId = extractDriveFolderId((env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim());
  const sanitizedFolderId = extractDriveFolderId(existingFolderId || "").replace(/['\\]/g, "").trim();

  // 1. Check if existingFolderId is valid and exists on Drive
  if (sanitizedFolderId && !sanitizedFolderId.startsWith("test_")) {
    try {
      const getRes = await drive.files.get({
        fileId: sanitizedFolderId,
        fields: "id, name, trashed",
        supportsAllDrives: true,
      });
      if (getRes.data.id && !getRes.data.trashed) {
        return getRes.data.id;
      }
    } catch (checkErr: any) {
      console.warn(`Candidate folder ${sanitizedFolderId} check failed, will find or recreate:`, checkErr?.message);
    }
  }

  // 2. Search for existing candidate folder under root folder
  if (rootFolderId && rootFolderId !== "your_google_drive_folder_id_here" && rootFolderId.length > 5) {
    try {
      const safeId = candidateId.replace(/[/\\:*?"<>|']/g, "").trim();
      const searchRes = await drive.files.list({
        q: `'${rootFolderId}' in parents and name contains '${safeId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
        spaces: "drive",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      const found = searchRes.data.files?.[0];
      if (found?.id) {
        return found.id;
      }
    } catch (searchErr) {
      console.warn("Search for existing candidate folder failed:", searchErr);
    }
  }

  // 3. Create fresh candidate folder
  return createCandidateFolder(candidateName, candidateId);
}

/**
 * Uploads a document directly to the candidate's Drive folder.
 * If a file with the identical name exists in that folder, it is deleted and overwritten with zero version history.
 */
export async function uploadFileToCandidateFolder(
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string = "application/pdf",
  candidateContext?: { candidate_id?: string; full_name?: string }
): Promise<{ fileId: string; webViewLink: string; resolvedFolderId?: string }> {
  await ensureAuthReady();
  const env = getEnv();
  const isDriveConfigured = Boolean(
    (env.GOOGLE_PRIVATE_KEY && env.GOOGLE_PRIVATE_KEY.length > 50) ||
    (env.GOOGLE_DRIVE_ROOT_FOLDER_ID && env.GOOGLE_DRIVE_ROOT_FOLDER_ID !== "your_google_drive_folder_id_here")
  );

  let targetFolderId = extractDriveFolderId(folderId || "").replace(/['\\]/g, "").trim();

  // If Drive is configured and we have candidateContext, ensure a real folder exists
  if (isDriveConfigured && candidateContext?.candidate_id) {
    try {
      targetFolderId = await ensureCandidateFolder(
        candidateContext.full_name || "מועמד",
        candidateContext.candidate_id,
        targetFolderId
      );
    } catch (ensureErr) {
      console.error("Could not ensure candidate folder before upload:", ensureErr);
    }
  }

  try {
    const drive = getDriveClient();
    const sanitizedFileName = fileName.replace(/['\\]/g, "");

    // 1. Check for existing file with identical name in folder and overwrite cleanly
    if (targetFolderId && !targetFolderId.startsWith("test_")) {
      try {
        const searchResponse = await drive.files.list({
          q: `'${targetFolderId}' in parents and name = '${sanitizedFileName}' and trashed = false`,
          fields: "files(id, name)",
          spaces: "drive",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const existingFiles = searchResponse.data.files || [];
        for (const existingFile of existingFiles) {
          if (existingFile.id) {
            try {
              await drive.files.delete({
                fileId: existingFile.id,
                supportsAllDrives: true,
              });
            } catch {
              // Ignore if already removed
            }
          }
        }
      } catch (listErr: any) {
        console.warn(`Existing files check in folder ${targetFolderId}:`, listErr?.message);
        // If folder not found (404) and candidateContext is available, recreate folder
        if (candidateContext?.candidate_id && (listErr?.status === 404 || String(listErr?.message).includes("File not found"))) {
          targetFolderId = await createCandidateFolder(
            candidateContext.full_name || "מועמד",
            candidateContext.candidate_id
          );
        }
      }
    }

    // 2. Prepare upload stream from buffer
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // 3. Create new file in folder using targetFolderId (NOT raw folderId)
    const createResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
        mimeType,
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    const fileId = createResponse.data.id;
    if (!fileId) {
      throw new Error(`Drive upload succeeded but no file ID was returned for ${fileName}`);
    }

    const webViewLink =
      createResponse.data.webViewLink ||
      `https://drive.google.com/file/d/${fileId}/view`;

    return {
      fileId,
      webViewLink,
      resolvedFolderId: targetFolderId,
    };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`Drive upload error for "${fileName}":`, error);

    // If Google Drive API is configured, DO NOT silently swallow!
    if (isDriveConfigured) {
      if (errorMsg.includes("Service Accounts do not have storage quota")) {
        throw new Error(
          `שגיאת מכסת אחסון ב-Google Drive: חשבון שירות (Service Account) אינו מורשה להחזיק קבצים בנפח ב-'כונן שלי' (My Drive) רגיל. פתרון: יש להעביר את תיקיית השורש ל-'כונן משותף' (Google Shared Drive) ולהוסיף את ה-Service Account כחבר בו, או לחבר חשבון Google ישירות דרך הגדרות המערכת (OAuth).`
        );
      }
      throw new Error(`שגיאה בשמירת המסמך "${fileName}" ב-Google Drive: ${errorMsg}`);
    }

    // Only fallback to local test storage in offline unconfigured local dev
    return saveLocalTestUpload(folderId, fileName, fileBuffer);
  }
}

/**
 * Deletes a candidate's Google Drive folder by folderId and/or candidateId.
 */
export async function deleteCandidateFolder(
  folderId?: string | null,
  candidateId?: string | null
): Promise<void> {
  await ensureAuthReady();
  const drive = getDriveClient();
  const env = getEnv();
  const rootFolderId = extractDriveFolderId((env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim());

  async function removeFolderById(id: string): Promise<boolean> {
    const cleanId = extractDriveFolderId(id).trim();
    if (!cleanId || cleanId.startsWith("test_drive_folder_")) return false;

    let success = false;
    // 1. Permanent delete
    try {
      await drive.files.delete({ fileId: cleanId, supportsAllDrives: true });
      success = true;
    } catch (delErr: any) {
      console.warn(`deleteCandidateFolder permanent delete failed for ${cleanId}:`, delErr?.message);
    }

    // 2. Move to trash
    if (!success) {
      try {
        await drive.files.update({
          fileId: cleanId,
          requestBody: { trashed: true },
          supportsAllDrives: true,
        });
        success = true;
      } catch (trashErr: any) {
        console.warn(`deleteCandidateFolder trash failed for ${cleanId}:`, trashErr?.message);
      }
    }

    // 3. Remove parent
    if (!success && rootFolderId) {
      try {
        await drive.files.update({
          fileId: cleanId,
          removeParents: rootFolderId,
          supportsAllDrives: true,
        });
        success = true;
      } catch (remErr: any) {
        console.error(`deleteCandidateFolder removeParent failed for ${cleanId}:`, remErr?.message);
      }
    }

    // Clean local fallback uploads if any
    try {
      const primaryDir = path.join(process.cwd(), "data", "test-uploads", cleanId);
      if (fs.existsSync(primaryDir)) {
        fs.rmSync(primaryDir, { recursive: true, force: true });
      }
      const fallbackDir = path.join(os.tmpdir(), "onboarding-test-uploads", cleanId);
      if (fs.existsSync(fallbackDir)) {
        fs.rmSync(fallbackDir, { recursive: true, force: true });
      }
    } catch {}

    return success;
  }

  // 1. Direct deletion by folderId
  if (folderId) {
    await removeFolderById(folderId);
  }

  // 2. Search root directory for any folders matching candidateId in name
  if (candidateId && rootFolderId) {
    try {
      const safeId = candidateId.trim().toLowerCase();
      const res = await drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const folders = res.data.files || [];
      for (const f of folders) {
        if (f.id && f.name && f.name.toLowerCase().includes(safeId)) {
          await removeFolderById(f.id);
        }
      }
    } catch (err) {
      console.warn(`Could not search candidate folders for ${candidateId}:`, err);
    }
  }
}

/**
 * Cleans up orphaned candidate folders in Google Drive whose candidates no longer exist in the system.
 * If activeCandidateIds is empty (or during system reset), ALL candidate folders in the root folder are deleted.
 */
export async function cleanupOrphanedDriveFolders(
  activeCandidateIds: string[] = []
): Promise<number> {
  await ensureAuthReady();
  try {
    const drive = getDriveClient();
    const env = getEnv();
    const rootFolderId = extractDriveFolderId((env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim());

    if (
      !rootFolderId ||
      rootFolderId === "your_google_drive_folder_id_here" ||
      rootFolderId.length <= 5
    ) {
      console.warn("cleanupOrphanedDriveFolders: rootFolderId not configured:", rootFolderId);
      return 0;
    }

    // List all folders inside the root Drive directory
    const res = await drive.files.list({
      q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name, parents)",
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const folders = res.data.files || [];
    const activeSet = new Set(
      activeCandidateIds.map((id) => (id || "").trim().toLowerCase()).filter(Boolean)
    );

    let deletedCount = 0;

    for (const folder of folders) {
      if (!folder.id || !folder.name) continue;

      let shouldDelete = false;

      if (activeSet.size === 0) {
        // Reset mode: delete every folder inside rootFolderId!
        shouldDelete = true;
      } else {
        const folderNameLower = folder.name.toLowerCase();
        let matchesActiveCandidate = false;

        for (const activeId of Array.from(activeSet)) {
          if (folderNameLower.includes(activeId) || folder.id === activeId) {
            matchesActiveCandidate = true;
            break;
          }
        }

        if (!matchesActiveCandidate) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        let deleted = false;

        // Attempt 1: Permanent delete
        try {
          await drive.files.delete({
            fileId: folder.id,
            supportsAllDrives: true,
          });
          deleted = true;
        } catch (delErr: any) {
          console.warn(`Permanent delete failed for "${folder.name}" (${folder.id}):`, delErr?.message);
        }

        // Attempt 2: Move to trash
        if (!deleted) {
          try {
            await drive.files.update({
              fileId: folder.id,
              requestBody: { trashed: true },
              supportsAllDrives: true,
            });
            deleted = true;
          } catch (trashErr: any) {
            console.warn(`Move to trash failed for "${folder.name}" (${folder.id}):`, trashErr?.message);
          }
        }

        // Attempt 3: Remove from root parent folder
        if (!deleted) {
          try {
            await drive.files.update({
              fileId: folder.id,
              removeParents: rootFolderId,
              supportsAllDrives: true,
            });
            deleted = true;
          } catch (remErr: any) {
            console.error(`Remove parent failed for "${folder.name}" (${folder.id}):`, remErr?.message);
          }
        }

        if (deleted) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  } catch (err: any) {
    console.error("Cleanup orphaned drive folders error:", err?.message || err);
    return 0;
  }
}
