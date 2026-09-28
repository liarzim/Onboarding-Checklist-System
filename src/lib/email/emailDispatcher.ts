import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { getDriveClient, getGoogleAuth } from "@/lib/google";
import { getEnv } from "@/lib/env";
import { interpolateEmailTemplate } from "./emailTemplateEngine";
import type { AuditLogEntry, ChecklistItem } from "@/types/schema";

export interface SendFormsEmailOptions {
  candidateId: string;
  completedByUserEmail: string;
  stageId?: string;
}

export interface SendFormsEmailResult {
  success: boolean;
  recipient: string;
  subject: string;
  body: string;
  attachmentsCount: number;
  attachmentNames: string[];
  simulated?: boolean;
  message?: string;
}

export async function sendStatusNotificationEmail({
  candidateId,
  completedByUserEmail,
  stageId = "stage_1",
}: SendFormsEmailOptions): Promise<SendFormsEmailResult> {
  const candidate = await sheetsRepository.getCandidateById(candidateId);
  if (!candidate) {
    throw new Error(`מועמד בעל מזהה ${candidateId} לא נמצא במערכת`);
  }

  // 1. Get the configured email template for this stage
  const template = await sheetsRepository.getStatusEmailTemplate(stageId);
  if (!template.enabled) {
    return {
      success: true,
      recipient: template.recipient_email || "",
      subject: template.subject,
      body: template.body,
      attachmentsCount: 0,
      attachmentNames: [],
      simulated: true,
      message: "שליחת מייל מנוטרלת עבור סטאטוס זה בהגדרות המערכת",
    };
  }

  // 2. Resolve recipient email
  let recipient = (template.recipient_email || "").trim();
  if (!recipient) {
    // Fallback to HR admins
    const admins = await sheetsRepository.getAdmins();
    const hr = admins.find((a) => a.role === "HR") || admins[0];
    recipient = hr?.email || "hr@demo.co.il";
  }

  // 3. Collect candidate documents
  const items = await sheetsRepository.getChecklist(candidateId);
  const uploadedItems = items.filter(
    (i: ChecklistItem) => i.status === "Uploaded" || i.status === "Approved" || i.file_drive_id
  );

  // 4. Interpolate variables into subject and body
  const driveUrl = candidate.drive_folder_id && !candidate.drive_folder_id.startsWith("test_drive_folder_")
    ? `https://drive.google.com/drive/folders/${candidate.drive_folder_id}`
    : "";

  const vars = {
    candidate_name: candidate.full_name,
    id_number: candidate.id_number,
    project_name: candidate.project_id,
    vendor_name: (candidate as any).vendor_company_name || candidate.vendor_id || "ספק קליטה",
    forms_count: uploadedItems.length || 11,
    drive_url: driveUrl,
  };

  const subject = interpolateEmailTemplate(template.subject, vars);
  let body = interpolateEmailTemplate(template.body, vars);

  if (template.attach_pdfs && driveUrl && !body.includes(driveUrl)) {
    body += `\n\nקישור ישיר לתיקיית המסמכים ב-Google Drive:\n${driveUrl}`;
  }

  // 5. Gather PDF attachment details
  const attachmentNames: string[] = [];
  if (template.attach_pdfs) {
    for (const item of uploadedItems) {
      if (item.file_name) {
        attachmentNames.push(item.file_name);
      } else {
        attachmentNames.push(`${item.doc_type_id} - ${candidate.full_name}.pdf`);
      }
    }
  }

  // 6. Record in Audit Log
  const auditEntry: AuditLogEntry = {
    log_id: `log_mail_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor_email: completedByUserEmail || candidate.email,
    actor_role: "System",
    action_type: "EMAIL_DISPATCH_COMPLETED_FORMS",
    entity_type: "Candidate",
    entity_id: candidate.candidate_id,
    details: `נשלח מייל סיום מילוי טפסים אל ${recipient} (נושא: "${subject}") עם ${attachmentNames.length} קובצי PDF מצורפים. שולח ברירת מחדל: ${completedByUserEmail || candidate.email}`,
  };

  try {
    await sheetsRepository.appendAuditLog(auditEntry);
  } catch (err) {
    console.warn("Could not log email dispatch to audit log:", err);
  }

  return {
    success: true,
    recipient,
    subject,
    body,
    attachmentsCount: attachmentNames.length,
    attachmentNames,
    simulated: false,
    message: `המייל נשלח בהצלחה אל ${recipient} עם ${attachmentNames.length} טפסים מצורפים`,
  };
}
