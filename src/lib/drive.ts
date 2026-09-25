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

  // 1. Direct deletion if folderId is provided
  if (folderId) {
    const cleanId = extractDriveFolderId(folderId).trim();
    if (cleanId && !cleanId.startsWith("test_drive_folder_")) {
      try {
        await drive.files.delete({
          fileId: cleanId,
          supportsAllDrives: true,
        });
      } catch (err: any) {
        try {
          await drive.files.update({
            fileId: cleanId,
            requestBody: { trashed: true },
            supportsAllDrives: true,
          });
        } catch {
          console.warn(`Could not delete Drive folder by ID ${cleanId}:`, err?.message || err);
        }
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
  }

  // 2. Search for any remaining folder in root Drive directory named with candidateId
  if (candidateId) {
    try {
      const env = getEnv();
      const rootFolderId = extractDriveFolderId((env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim());
      const safeId = candidateId.replace(/[/\\:*?"<>|']/g, "").trim();

      let query = `name contains '${safeId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      if (
        rootFolderId &&
        rootFolderId !== "your_google_drive_folder_id_here" &&
        rootFolderId.length > 5
      ) {
        query += ` and '${rootFolderId}' in parents`;
      }

      const res = await drive.files.list({
        q: query,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const matching = res.data.files || [];
      for (const item of matching) {
        if (item.id) {
          try {
            await drive.files.delete({
              fileId: item.id,
              supportsAllDrives: true,
            });
          } catch {
            try {
              await drive.files.update({
                fileId: item.id,
                requestBody: { trashed: true },
                supportsAllDrives: true,
              });
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn(`Could not search/delete candidate folders for ${candidateId}:`, err);
    }
  }
}

/**
 * Cleans up orphaned candidate folders in Google Drive whose candidates no longer exist in the system.
 */
export async function cleanupOrphanedDriveFolders(
  activeCandidateIds: string[]
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
      return 0;
    }

    const res = await drive.files.list({
      q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const activeSet = new Set(activeCandidateIds);
    const folders = res.data.files || [];
    let deletedCount = 0;

    for (const folder of folders) {
      if (!folder.id || !folder.name) continue;
      // Candidate folders are named: [candidateId] - [candidateName]
      // Or start with CND- / cnd-
      const match = folder.name.match(/^(cnd-[^\s-]+)/i) || folder.name.split(" - ");
      const folderCandidateId = match ? (match[1]?.trim() || match[0]?.trim()) : "";

      if (folderCandidateId && folderCandidateId.toLowerCase().startsWith("cnd-")) {
        if (!activeSet.has(folderCandidateId)) {
          try {
            await drive.files.delete({
              fileId: folder.id,
              supportsAllDrives: true,
            });
            deletedCount++;
          } catch {
            try {
              await drive.files.update({
                fileId: folder.id,
                requestBody: { trashed: true },
                supportsAllDrives: true,
              });
              deletedCount++;
            } catch {}
          }
        }
      }
    }

    return deletedCount;
  } catch (err) {
    console.warn("Cleanup orphaned drive folders error:", err);
    return 0;
  }
}
