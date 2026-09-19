import { NextResponse } from "next/server";
import { z } from "zod";
import { getVendorSession } from "@/lib/auth";
import { assertVendorOwnership, ForbiddenError, NotFoundError } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { uploadFileToCandidateFolder } from "@/lib/drive";
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

    // 1. Verify Vendor Session
    const session = await getVendorSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Multipart Form Data
    const formData = await request.formData();
    const file = formData.get("file");
    const candidateId = formData.get("candidate_id");
    const docTypeId = formData.get("doc_type_id");

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

    // 3. Validate File Type (PDF Only)
    const fileNameLower = file.name.toLowerCase();
    const isPdfMime = file.type === "application/pdf";
    const isPdfExt = fileNameLower.endsWith(".pdf");

    if (!isPdfMime && !isPdfExt) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "רק קבצים בפורמט PDF מורשים להעלאה במערכת",
        },
        { status: 400 }
      );
    }

    // 4. Validate File Size (Max 10MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "גודל הקובץ חורג מהמגבלה המותרת (מקסימום 10MB)",
        },
        { status: 400 }
      );
    }

    // 5. Convert File to Buffer and Verify PDF Magic Bytes (Deep Content Inspection)
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    if (!isValidPdfMagicBytes(fileBuffer)) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "תוכן הקובץ אינו קובץ PDF תקין (חתימת קובץ שגויה)",
        },
        { status: 400 }
      );
    }

    // 6. Check Multi-Tenant Ownership Guard
    const candidate = await assertVendorOwnership(session.vendor_id, candidateId);

    // 7. Fetch Document Type & Vendor Company Name
    const docTypes = await sheetsRepository.getDocumentTypes();
    const docType = docTypes.find((d) => d.doc_type_id === docTypeId);

    if (!docType) {
      return NextResponse.json(
        { error: "Validation Error", message: `סוג מסמך "${docTypeId}" אינו קיים במערכת` },
        { status: 400 }
      );
    }

    let vendorCompanyName = session.company_name;
    const vendorRecord = await sheetsRepository.getVendorById(candidate.vendor_id);
    if (vendorRecord && vendorRecord.company_name) {
      vendorCompanyName = vendorRecord.company_name;
    }

    // 8. Construct Exact Standardized File Name:
    // [שם המסמך].[שם המועמד].[פרוייקט מיועד].[חברת המועמד].pdf
    const cleanDocName = sanitizeFileNamePart(docType.doc_name);
    const cleanCandidateName = sanitizeFileNamePart(candidate.full_name);
    const cleanProjectName = sanitizeFileNamePart(candidate.project_id);
    const cleanCompanyName = sanitizeFileNamePart(vendorCompanyName);

    const standardizedFileName = `${cleanDocName}.${cleanCandidateName}.${cleanProjectName}.${cleanCompanyName}.pdf`;

    // 9. Upload to Candidate Google Drive Folder with overwrite
    const { fileId, webViewLink } = await uploadFileToCandidateFolder(
      candidate.drive_folder_id,
      standardizedFileName,
      fileBuffer,
      "application/pdf"
    );

    // 10. Update Candidate Checklist Item in Sheets
    await sheetsRepository.updateChecklistItem(candidateId, docTypeId, {
      status: "Uploaded",
      file_name: standardizedFileName,
      file_drive_id: fileId,
      file_drive_url: webViewLink,
    });

    // 11. Append Event to Audit Log
    const now = new Date().toISOString();
    const auditEntry: AuditLogEntry = {
      log_id: `log_${Date.now()}`,
      timestamp: now,
      actor_email: session.email,
      actor_role: "Vendor",
      action_type: "UPLOAD_DOCUMENT",
      entity_type: "ChecklistItem",
      entity_id: `${candidateId}_${docTypeId}`,
      details: `Vendor ${session.company_name} uploaded document "${standardizedFileName}" for candidate ${candidate.full_name} (${candidateId})`,
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
