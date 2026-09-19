import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import type { AuditLogEntry } from "@/types/schema";

const UpdateStageSchema = z.object({
  stage_id: z.string().min(1, "מזהה שלב נדרש"),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidateId = params.id;
    const body = await request.json();
    const parsed = UpdateStageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: parsed.error.issues[0]?.message || "קלט שגוי",
        },
        { status: 400 }
      );
    }

    const { stage_id } = parsed.data;

    // Verify candidate exists
    const candidate = await sheetsRepository.getCandidateById(candidateId);
    if (!candidate) {
      return NextResponse.json(
        { error: "Not Found", message: `מועמד "${candidateId}" לא נמצא` },
        { status: 404 }
      );
    }

    // Verify stage exists
    const stages = await sheetsRepository.getSettingStages();
    const targetStage = stages.find((s) => s.stage_id === stage_id);
    if (!targetStage) {
      return NextResponse.json(
        { error: "Invalid Stage", message: `שלב "${stage_id}" אינו מוכר במערכת` },
        { status: 400 }
      );
    }

    const previousStageId = candidate.current_stage_id;

    // Update candidate stage in Candidates sheet
    await sheetsRepository.updateCandidateStage(candidateId, stage_id);

    // Append event to AuditLogs
    const now = new Date().toISOString();
    const auditEntry: AuditLogEntry = {
      log_id: `log_${Date.now()}`,
      timestamp: now,
      actor_email: session.email,
      actor_role: session.role,
      action_type: "UPDATE_STAGE",
      entity_type: "Candidate",
      entity_id: candidateId,
      details: `User ${session.full_name} (${session.role}) updated candidate ${candidate.full_name} stage from "${previousStageId}" to "${targetStage.stage_name}" (${stage_id})`,
    };
    await sheetsRepository.appendAuditLog(auditEntry);

    return NextResponse.json({
      success: true,
      message: `שלב המועמד עודכן בהצלחה ל-"${targetStage.stage_name}"`,
      stage_id,
      stage_name: targetStage.stage_name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בעדכון שלב המועמד";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
