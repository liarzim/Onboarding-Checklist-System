import { Readable } from "stream";
import fs from "fs";
import path from "path";
import os from "os";
import { getDriveClient } from "./google";
import { getEnv } from "./env";
import { saveLocalTestUpload } from "./testStore";
import { extractDriveFolderId } from "./dynamicConfig";

/**
 * Creates a dedicated candidate folder under the root onboarding Drive folder.
 * Folder name format: [candidateId] - [candidateName]
 */
export async function createCandidateFolder(
  candidateName: string,
  candidateId: string
): Promise<string> {
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
 * Uploads a document directly to the candidate's Drive folder.
 * If a file with the identical name exists in that folder, it is deleted and overwritten with zero version history.
 */
export async function uploadFileToCandidateFolder(
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<{ fileId: string; webViewLink: string }> {
  try {
    const drive = getDriveClient();
    // 1. Check for existing file with the identical name in the folder
    // Robustly sanitize search parameters against Drive search query injection
    const sanitizedFolderId = extractDriveFolderId(folderId).replace(/['\\]/g, "");
    const sanitizedFileName = fileName.replace(/['\\]/g, "");

    const searchResponse = await drive.files.list({
      q: `'${sanitizedFolderId}' in parents and name = '${sanitizedFileName}' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const existingFiles = searchResponse.data.files || [];

    // 2. Delete existing file(s) with identical name to ensure clean overwrite without version history
    for (const existingFile of existingFiles) {
      if (existingFile.id) {
        try {
          await drive.files.delete({
            fileId: existingFile.id,
            supportsAllDrives: true,
          });
        } catch {
          // Continue if file was already removed
        }
      }
    }

    // 3. Prepare upload stream from buffer
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // 4. Create new file in folder
    const createResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
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
    };
  } catch (error) {
    // If Google Drive API is not configured or offline during testing, save locally in test store
    console.warn(`Drive upload offline fallback for "${fileName}":`, error);
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
