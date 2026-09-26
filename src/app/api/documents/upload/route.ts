import { NextResponse } from "next/server";
import { z } from "zod";
import { getVendorSession } from "@/lib/auth";
import { assertVendorOwnership, ForbiddenError, NotFoundError } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { uploadFileToCandidateFolder, ensureAuthReady } from "@/lib/drive";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { AuditLogEntry } from "@/types/schema";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_MAGIC_BYTES = "%PDF-";

function sanitizeFileNamePart(part: string): string {
  return part.replace(/[/\\:*?"<>|]/g, "").trim();
}

/**
 * Validates that file buffer starts with genuine PDF magic number bytes (%PDF-).
 */
function isValidPdfMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const header = buffer.subarray(0, 5).toString("utf-8");
  return header === PDF_MAGIC_BYTES;
}

export async function POST(request: Request) {
  try {
    // Ensure authentication is ready and synced from Google Sheets before accessing sheets or drive
    await ensureAuthReady();

    // 0. Rate Limiting per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`upload_${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 20,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "חרגת ממכסת ההעלאות המותרת לדקה. אנא נסה שוב בעוד מספר שניות.",
        },
        { status: 429 }
      );
    }

    // 1. Verify Vendor Session OR Candidate Token
    const formData = await request.formData();
    const file = formData.get("file");
    const candidateId = formData.get("candidate_id");
    const docTypeId = formData.get("doc_type_id");
    const token =
      (formData.get("token") as string | null) ||
      request.headers.get("x-candidate-token");
    const rawFormData = formData.get("form_data") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Validation Error", message: "נא לצרף קובץ להעלאה" },
        { status: 400 }
      );
    }

    if (!candidateId || typeof candidateId !== "string") {
      return NextResponse.json(
        { error: "Validation Error", message: "מזהה מועמד חסר" },
        { status: 400 }
      );
    }

    if (!docTypeId || typeof docTypeId !== "string") {
      return NextResponse.json(
        { error: "Validation Error", message: "סוג מסמך חסר" },
        { status: 400 }
      );
    }

    const session = await getVendorSession();
    let candidate: any = null;
    let actorEmail = "candidate@portal";
    let actorRole: "Vendor" | "Admin" = "Vendor";

    if (token) {
      const candidateByToken = await sheetsRepository.getCandidateByToken(token);
      if (!candidateByToken || candidateByToken.candidate_id !== candidateId) {
        return NextResponse.json(
          { error: "Forbidden", message: "טוקן מועמד אינו תקין או פג תוקף" },
          { status: 403 }
        );
      }
      candidate = candidateByToken;
      actorEmail = candidateByToken.email;
    } else if (session) {
      candidate = await assertVendorOwnership(session.vendor_id, candidateId);
      actorEmail = session.email;
    } else {
      return NextResponse.json(
        { error: "Unauthorized", message: "נדרשת הזדהות ספק או טוקן מועמד תקין" },
        { status: 401 }
      );
    }

    // 2. Validate File Type based on docTypeId & Admin Upload Policy
    const {
      getUploadPolicy,
      isPassportPhotoExtensionAllowed,
      isIdCardExtensionAllowed,
      getFileExtension,
    } = await import("@/lib/uploadPolicy");
    const policy = getUploadPolicy();
    const fileNameLower = file.name.toLowerCase();
    const ext = getFileExtension(file.name);

    if (docTypeId === "doc_11") {
      // Passport photo: Strictly images with allowed extensions defined by Admin
      const extCheck = isPassportPhotoExtensionAllowed(file.name, policy);
      if (!extCheck.allowed) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: `סיומת הקובץ "${extCheck.ext || "ללא סיומת"}" אינה מורשית עבור תמונת פספורט. סיומות תמונה מורשות ע"י המנהל: ${extCheck.allowedExtensions.join(", ")}`,
          },
          { status: 400 }
        );
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: "חובה להעלות קובץ תמונה בלבד עבור תמונת פספורט",
          },
          { status: 400 }
        );
      }

      if (file.size > policy.passport_photo.max_size_mb * 1024 * 1024) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: `גודל התמונה חורג מהמקסימום המותר (${policy.passport_photo.max_size_mb}MB)`,
          },
          { status: 400 }
        );
      }
    } else if (docTypeId === "doc_10") {
      // ID card: Images or PDF with allowed extensions
      const extCheck = isIdCardExtensionAllowed(file.name, policy);
      if (!extCheck.allowed) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: `סיומת הקובץ "${extCheck.ext || "ללא סיומת"}" אינה מורשית עבור תעודת זהות. סיומות מורשות: ${extCheck.allowedExtensions.join(", ")}`,
          },
          { status: 400 }
        );
      }

      if (file.size > policy.id_card.max_size_mb * 1024 * 1024) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: `גודל הקובץ חורג מהמקסימום המותר (${policy.id_card.max_size_mb}MB)`,
          },
          { status: 400 }
        );
      }
    } else {
      // Standard forms (doc_1 to doc_9)
      const isPdfMime = file.type === "application/pdf";
      const isPdfExt = fileNameLower.endsWith(".pdf");

      if (!isPdfMime && !isPdfExt) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: "רק קבצים בפורמט PDF מורשים להעלאה במערכת עבור טפסים חתומים",
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: "גודל הקובץ חורג מהמגבלה המותרת (מקסימום 10MB)",
          },
          { status: 400 }
        );
      }
    }

    // 3. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Deep Content Inspection for PDFs only
    if (docTypeId !== "doc_11" && file.type === "application/pdf") {
      if (!isValidPdfMagicBytes(fileBuffer)) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: "תוכן הקובץ אינו קובץ PDF תקין (חתימת קובץ שגויה)",
          },
          { status: 400 }
        );
      }
    }

    // 4. Fetch Document Type & Vendor Company Name
    const docTypes = await sheetsRepository.getDocumentTypes();
    const docType = docTypes.find((d) => d.doc_type_id === docTypeId);

    if (!docType) {
      return NextResponse.json(
        { error: "Validation Error", message: `סוג מסמך "${docTypeId}" אינו קיים במערכת` },
        { status: 400 }
      );
    }

    let vendorCompanyName = candidate.vendor_company_name || "";
    try {
      const vendorRecord = await sheetsRepository.getVendorById(candidate.vendor_id);
      if (vendorRecord && vendorRecord.company_name) {
        vendorCompanyName = vendorRecord.company_name;
      }
    } catch {
      // Ignore
    }

    // 5. Construct Standardized File Name
    const customFileName = formData.get("custom_file_name") as string | null;
    const cleanDocName = sanitizeFileNamePart(docType.doc_name);
    const cleanCandidateName = sanitizeFileNamePart(candidate.full_name);
    const cleanIdNumber = sanitizeFileNamePart(candidate.id_number || "");
    const cleanProjectName = sanitizeFileNamePart(candidate.project_id || "פרויקט");
    const cleanCompanyName = sanitizeFileNamePart(vendorCompanyName || "ספק");

    let standardizedFileName = "";
    if (customFileName) {
      standardizedFileName = sanitizeFileNamePart(customFileName);
    } else if (docTypeId === "doc_11") {
      standardizedFileName = cleanIdNumber
        ? `תמונת פספורט - ${cleanCandidateName} - ${cleanIdNumber}${ext}`
        : `תמונת פספורט - ${cleanCandidateName}${ext}`;
    } else if (docTypeId === "doc_10") {
      standardizedFileName = cleanIdNumber
        ? `צילום תעודת זהות - ${cleanCandidateName} - ${cleanIdNumber}${ext}`
        : `צילום תעודת זהות - ${cleanCandidateName}${ext}`;
    } else {
      standardizedFileName = cleanIdNumber
        ? `${cleanDocName}.${cleanCandidateName}.${cleanIdNumber}.${cleanProjectName}.${cleanCompanyName}.pdf`
        : `${cleanDocName}.${cleanCandidateName}.${cleanProjectName}.${cleanCompanyName}.pdf`;
    }

    // 6. Upload to Candidate Google Drive Folder with overwrite
    const mimeType = file.type || (ext === ".pdf" ? "application/pdf" : "image/jpeg");
    const { fileId, webViewLink, resolvedFolderId } = await uploadFileToCandidateFolder(
      candidate.drive_folder_id,
      standardizedFileName,
      fileBuffer,
      mimeType,
      { candidate_id: candidate.candidate_id, full_name: candidate.full_name }
    );

    // If candidate Drive folder was resolved or created, update candidate record in Sheets
    if (resolvedFolderId && resolvedFolderId !== candidate.drive_folder_id) {
      try {
        await sheetsRepository.updateCandidateDriveFolder(candidateId, resolvedFolderId);
        candidate.drive_folder_id = resolvedFolderId;
      } catch (folderUpdateErr) {
        console.warn("Could not update candidate Drive folder ID in sheets:", folderUpdateErr);
      }
    }

    // 7. Update Candidate Checklist Item in Sheets
    await sheetsRepository.updateChecklistItem(candidateId, docTypeId, {
      status: "Uploaded",
      file_name: standardizedFileName,
      file_drive_id: fileId,
      file_drive_url: webViewLink,
      form_data: rawFormData || undefined,
    });

    // 8. Append Event to Audit Log
    const now = new Date().toISOString();
    const auditEntry: AuditLogEntry = {
      log_id: `log_${Date.now()}`,
      timestamp: now,
      actor_email: actorEmail,
      actor_role: actorRole,
      action_type: "UPLOAD_DOCUMENT",
      entity_type: "ChecklistItem",
      entity_id: `${candidateId}_${docTypeId}`,
      details: `${actorEmail} העלה את המסמך "${standardizedFileName}" עבור ${candidate.full_name} (${candidateId})`,
    };
    await sheetsRepository.appendAuditLog(auditEntry);

    return NextResponse.json({
      success: true,
      message: "הקובץ הועלה ועודכן בהצלחה",
      document: {
        candidate_id: candidateId,
        doc_type_id: docTypeId,
        doc_name: docType.doc_name,
        file_name: standardizedFileName,
        file_drive_id: fileId,
        file_drive_url: webViewLink,
        status: "Uploaded",
        updated_at: now,
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden", message: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not Found", message: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "שגיאה פנימית בהעלאת הקובץ";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
