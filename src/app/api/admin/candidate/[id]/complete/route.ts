import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import type { AuditLogEntry } from "@/types/schema";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidateId = params.id;
    const candidate = await sheetsRepository.getCandidateById(candidateId);

    if (!candidate) {
      return NextResponse.json(
        { error: "Not Found", message: `מועמד "${candidateId}" לא נמצא` },
        { status: 404 }
      );
    }

    if (candidate.is_completed) {
      return NextResponse.json(
        { error: "Already Completed", message: "תהליך הקליטה עבור מועמד זה כבר הושלם בעבר" },
        { status: 400 }
      );
    }

    // Ensure all required documents are fulfilled
    const [docTypes, checklist] = await Promise.all([
      sheetsRepository.getDocumentTypes(),
      sheetsRepository.getChecklist(candidateId),
    ]);

    const missingDocs: string[] = [];
    for (const docType of docTypes) {
      if (!docType.is_required) continue;

      const item = checklist.find((c) => c.doc_type_id === docType.doc_type_id);
      const isFulfilled =
        item &&
        (item.status === "uploaded" ||
          item.status === "Uploaded" ||
          item.status === "approved" ||
          item.status === "Approved");

      if (!isFulfilled) {
        missingDocs.push(docType.doc_name);
      }
    }

    if (missingDocs.length > 0) {
      return NextResponse.json(
        {
          error: "Incomplete Checklist",
          message: `לא ניתן להשלים תהליך: חסרים ${missingDocs.length} מסמכי חובה`,
          missingDocs,
        },
        { status: 400 }
      );
    }

    // Complete candidate in Google Sheets
    await sheetsRepository.completeCandidate(candidateId);

    // Append completion event to AuditLogs
    const now = new Date().toISOString();
    const auditEntry: AuditLogEntry = {
      log_id: `log_${Date.now()}`,
      timestamp: now,
      actor_email: session.email,
      actor_role: session.role,
      action_type: "COMPLETE_ONBOARDING",
      entity_type: "Candidate",
      entity_id: candidateId,
      details: `User ${session.full_name} (${session.role}) verified all mandatory documents and approved smart card issuance for candidate ${candidate.full_name} (${candidate.id_number})`,
    };
    await sheetsRepository.appendAuditLog(auditEntry);

    return NextResponse.json({
      success: true,
      message: `תהליך הקליטה של ${candidate.full_name} הושלם בהצלחה והכרטיס החכם אושר להנפקה`,
      candidate_id: candidateId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בסיום תהליך המועמד";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
