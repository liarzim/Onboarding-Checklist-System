import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { createCandidateFolder } from "@/lib/drive";
import { validateIsraeliId } from "@/lib/israeliId";
import type { Candidate, AuditLogEntry } from "@/types/schema";

export const dynamic = "force-dynamic";

const CreateAdminCandidateSchema = z.object({
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
  vendor_id: z
    .string()
    .min(1, "נא לבחור ספק או לציין ספק"),
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

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const isCompletedFilter = status === "completed";

    // Fetch all candidates, vendors, and stages in parallel
    const [allCandidates, vendors, stages] = await Promise.all([
      sheetsRepository.getCandidates(),
      sheetsRepository.getVendors(),
      sheetsRepository.getSettingStages(),
    ]);

    // Create lookup maps
    const vendorMap = new Map(vendors.map((v) => [v.vendor_id, v.company_name]));
    const stageMap = new Map(stages.map((s) => [s.stage_id, s.stage_name]));

    // Filter candidates by completion status
    const filtered = allCandidates.filter((c) => c.is_completed === isCompletedFilter);

    // Compute checklist completion counts for each candidate
    const candidatesWithDetails = await Promise.all(
      filtered.map(async (candidate) => {
        const checklist = await sheetsRepository.getChecklist(candidate.candidate_id);
        const totalDocs = checklist.length || 9;
        const uploadedDocs = checklist.filter(
          (item) =>
            item.status === "uploaded" ||
            item.status === "Uploaded" ||
            item.status === "approved" ||
            item.status === "Approved"
        ).length;

        const vendorName = vendorMap.get(candidate.vendor_id) || candidate.vendor_id || "לא צוין";
        const stageName = stageMap.get(candidate.current_stage_id) || candidate.current_stage_id;

        return {
          ...candidate,
          vendor_name: vendorName,
          stage_name: stageName,
          uploadedDocs,
          totalDocs,
          documentsRatio: `${uploadedDocs}/${totalDocs}`,
          completionPercentage: Math.round((uploadedDocs / totalDocs) * 100),
          isReadyForIssuance: uploadedDocs === totalDocs,
        };
      })
    );

    return NextResponse.json({
      candidates: candidatesWithDetails,
      meta: {
        total: candidatesWithDetails.length,
        status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בטעינת רשימת המועמדים";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateAdminCandidateSchema.safeParse(body);

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

    // 1. Create dedicated Google Drive folder
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
      vendor_id: data.vendor_id,
      project_id: data.project_id,
      drive_folder_id: driveFolderId,
      current_stage_id: "stage_1",
      is_completed: false,
      created_at: now,
      updated_at: now,
    };

    // 3. Append to Candidates Sheet / local test store
    await sheetsRepository.createCandidate(newCandidate);

    // 4. Initialize all 11 checklist items
    const docTypes = await sheetsRepository.getDocumentTypes();
    await sheetsRepository.initChecklist(candidateId, docTypes);

    // 5. Append Audit Log entry
    const auditEntry: AuditLogEntry = {
      log_id: `log_${Date.now()}`,
      timestamp: now,
      actor_email: session.email,
      actor_role: session.role,
      action_type: "CREATE_CANDIDATE",
      entity_type: "Candidate",
      entity_id: candidateId,
      details: `${session.role} user (${session.full_name}) created candidate ${data.full_name} (${data.id_number}) for vendor ${data.vendor_id} on project ${data.project_id}`,
    };
    await sheetsRepository.appendAuditLog(auditEntry);

    return NextResponse.json({
      success: true,
      candidate: newCandidate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה ביצירת המועמד";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}

