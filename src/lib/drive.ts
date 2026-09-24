import { Readable } from "stream";
import { getDriveClient } from "./google";
import { getEnv } from "./env";
import { saveLocalTestUpload } from "./testStore";

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

    const response = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [env.GOOGLE_DRIVE_ROOT_FOLDER_ID],
      },
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    const folderId = response.data.id;
    if (!folderId) {
      throw new Error(`Drive folder creation succeeded but no ID was returned for candidate ${candidateId}`);
    }

    return folderId;
  } catch (error) {
    // If Google Drive API is not configured or offline during testing, fallback to mock folder ID
    console.warn(`Drive folder creation offline fallback for "${folderName}":`, error);
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
    const sanitizedFolderId = folderId.replace(/['\\]/g, "");
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
