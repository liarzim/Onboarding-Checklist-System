import { NextResponse } from "next/server";
import { z } from "zod";
import { getVendorSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { setDemoCandidateCookie } from "@/lib/testStore";
import { createCandidateFolder } from "@/lib/drive";
import { validateIsraeliId } from "@/lib/israeliId";
import type { Candidate, AuditLogEntry } from "@/types/schema";

const CreateCandidateSchema = z.object({
  full_name: z
    .string()
    .min(2, "שם מלא חייב להכיל לפחות 2 תווים")
    .max(100, "שם מלא ארוך מדי"),
  id_number: z
    .string()
    .min(5, "מספר תעודת זהות חייב להכיל לפחות 5 ספרות")
    .max(20, "מספר תעודת זהות ארוך מדי")
    .refine((val) => validateIsraeliId(val), {
      message: "מספר תעודת זהות לא תקין (ספרת ביקורת שגויה)",
    }),
  project_id: z
    .string()
    .min(1, "נא לציין שם או מזהה פרויקט")
    .max(100, "שם פרויקט ארוך מדי"),
  email: z
    .string()
    .email("כתובת אימייל לא תקינה")
    .max(100, "כתובת אימייל ארוכה מדי"),
  phone: z
    .string()
    .min(7, "מספר טלפון לא תקין")
    .max(25, "מספר טלפון ארוך מדי")
    .regex(/^[0-9+\s()-]+$/, "מספר טלפון מכיל תווים לא חוקיים"),
});

export async function GET() {
  try {
    const session = await getVendorSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch candidates belonging strictly to the authenticated vendor
    const candidates = await sheetsRepository.getCandidates({
      vendor_id: session.vendor_id,
    });

    // Calculate document completion counts for each candidate
    const candidateList = await Promise.all(
      candidates.map(async (candidate) => {
        const checklist = await sheetsRepository.getChecklist(candidate.candidate_id);
        const totalDocs = checklist.length || 9;
        const uploadedDocs = checklist.filter(
          (item) => item.status === "uploaded" || item.status === "Uploaded" || item.status === "approved" || item.status === "Approved"
        ).length;

        return {
          ...candidate,
          completionRatio: `${uploadedDocs}/${totalDocs}`,
          completionPercentage: Math.round((uploadedDocs / totalDocs) * 100),
          uploadedDocs,
          totalDocs,
        };
      })
    );

    return NextResponse.json({
      candidates: candidateList,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בטעינת רשימת המועמדים";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getVendorSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateCandidateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: parsed.error.issues[0]?.message || "שגיאה בנתוני הטופס",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const candidateId = `cand_${Date.now()}`;

    // 1. Create dedicated Google Drive folder: [candidateId] - [candidateName]
    let driveFolderId = "";
    try {
      driveFolderId = await createCandidateFolder(data.full_name, candidateId);
    } catch (driveError) {
      const driveMsg = driveError instanceof Error ? driveError.message : "Drive creation failed";
      return NextResponse.json(
        {
          error: "Google Drive Error",
          message: `שגיאה ביצירת תיקיית Drive: ${driveMsg}`,
        },
        { status: 500 }
      );
    }

    // 2. Build Candidate model
    const newCandidate: Candidate = {
      candidate_id: candidateId,
      full_name: data.full_name,
      id_number: data.id_number,
      email: data.email,
      phone: data.phone,
      vendor_id: session.vendor_id,
      project_id: data.project_id,
      drive_folder_id: driveFolderId,
      current_stage_id: "stage_initial",
      is_completed: false,
      created_at: now,
      updated_at: now,
    };

    // 3. Append to Candidates Google Sheet
    await sheetsRepository.createCandidate(newCandidate);

    // 4. Initialize all 9 checklist items in Sheets with status 'Not_Uploaded'
    const docTypes = await sheetsRepository.getDocumentTypes();
    await sheetsRepository.initChecklist(candidateId, docTypes);

    // 5. Append Audit Log entry
    const auditEntry: AuditLogEntry = {
      log_id: `log_${Date.now()}`,
      timestamp: now,
      actor_email: session.email,
      actor_role: "Vendor",
      action_type: "CREATE_CANDIDATE",
      entity_type: "Candidate",
      entity_id: candidateId,
      details: `Vendor ${session.company_name} created candidate ${data.full_name} (${data.id_number}) for project ${data.project_id}`,
    };
    await sheetsRepository.appendAuditLog(auditEntry);

    const response = NextResponse.json({
      success: true,
      candidate: newCandidate,
    });

    setDemoCandidateCookie(response, newCandidate);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה ביצירת המועמד";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
