import { NextResponse } from "next/server";
import { getVendorSession, getAdminSession } from "@/lib/auth";
import { assertVendorOwnership } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { sendStatusNotificationEmail } from "@/lib/email/emailDispatcher";
import { createMailtoLink, interpolateEmailTemplate } from "@/lib/email/emailTemplateEngine";
import type { ChecklistItem } from "@/types/schema";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    if (!candidateId) {
      return NextResponse.json(
        { error: "Validation Error", message: "מזהה מועמד חסר" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || request.headers.get("x-candidate-token");
    const stageId = searchParams.get("stage_id") || "stage_1";

    let candidate: any = null;

    if (token) {
      const cand = await sheetsRepository.getCandidateByToken(token);
      if (!cand || cand.candidate_id !== candidateId) {
        return NextResponse.json(
          { error: "Forbidden", message: "טוקן מועמד אינו תקין" },
          { status: 403 }
        );
      }
      candidate = cand;
    } else {
      const vendorSession = await getVendorSession();
      if (vendorSession) {
        candidate = await assertVendorOwnership(vendorSession.vendor_id, candidateId);
      } else {
        const adminSession = await getAdminSession();
        if (adminSession) {
          candidate = await sheetsRepository.getCandidateById(candidateId);
        } else {
          return NextResponse.json(
            { error: "Unauthorized", message: "נדרשת הזדהות תקינה" },
            { status: 401 }
          );
        }
      }
    }

    if (!candidate) {
      return NextResponse.json(
        { error: "Not Found", message: "מועמד לא נמצא" },
        { status: 404 }
      );
    }

    const template = await sheetsRepository.getStatusEmailTemplate(stageId);
    let recipient = (template.recipient_email || "").trim();
    if (!recipient) {
      const admins = await sheetsRepository.getAdmins();
      const hr = admins.find((a) => a.role === "HR") || admins[0];
      recipient = hr?.email || "hr@demo.co.il";
    }

    const items = await sheetsRepository.getChecklist(candidateId);
    const uploadedItems = items.filter(
      (i: ChecklistItem) => i.status === "Uploaded" || i.status === "Approved" || i.file_drive_id
    );

    const driveUrl = candidate.drive_folder_id && !candidate.drive_folder_id.startsWith("test_drive_folder_")
      ? `https://drive.google.com/drive/folders/${candidate.drive_folder_id}`
      : "";

    const docTypes = await sheetsRepository.getDocumentTypes();
    const formsList = docTypes
      .map((doc, idx) => `${idx + 1}. ${doc.doc_name}`)
      .join("\n");

    const vars = {
      candidate_name: candidate.full_name,
      id_number: candidate.id_number,
      project_name: candidate.project_id,
      vendor_name: (candidate as any).vendor_company_name || candidate.vendor_id || "ספק קליטה",
      forms_count: uploadedItems.length || 11,
      drive_url: driveUrl,
      forms_list: formsList,
    };

    const subject = interpolateEmailTemplate(template.subject, vars);
    let body = interpolateEmailTemplate(template.body, vars);
    if (template.attach_pdfs && driveUrl && !body.includes(driveUrl)) {
      body += `\n\nקישור ישיר לתיקיית המסמכים ב-Google Drive:\n${driveUrl}`;
    }

    const mailtoLink = createMailtoLink(recipient, subject, body);

    return NextResponse.json({
      success: true,
      recipient,
      recipientEmail: recipient,
      subject,
      body,
      mailtoUrl: mailtoLink,
      mailtoLink,
      attachmentsCount: uploadedItems.length,
      data: {
        recipient,
        subject,
        body,
        mailtoLink,
        mailtoUrl: mailtoLink,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error?.message || "שגיאה בקבלת נתוני המייל",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    if (!candidateId) {
      return NextResponse.json(
        { error: "Validation Error", message: "מזהה מועמד חסר" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const token = body.token || request.headers.get("x-candidate-token");
    const stageId = body.stage_id || "stage_1";

    let completedByUserEmail = "";
    let candidate: any = null;

    if (token) {
      const cand = await sheetsRepository.getCandidateByToken(token);
      if (!cand || cand.candidate_id !== candidateId) {
        return NextResponse.json(
          { error: "Forbidden", message: "טוקן מועמד אינו תקין" },
          { status: 403 }
        );
      }
      candidate = cand;
      completedByUserEmail = cand.email;
    } else {
      const vendorSession = await getVendorSession();
      if (vendorSession) {
        candidate = await assertVendorOwnership(vendorSession.vendor_id, candidateId);
        completedByUserEmail = vendorSession.email;
      } else {
        const adminSession = await getAdminSession();
        if (adminSession) {
          candidate = await sheetsRepository.getCandidateById(candidateId);
          completedByUserEmail = adminSession.email;
        } else {
          return NextResponse.json(
            { error: "Unauthorized", message: "נדרשת הזדהות תקינה" },
            { status: 401 }
          );
        }
      }
    }

    if (!candidate) {
      return NextResponse.json(
        { error: "Not Found", message: "מועמד לא נמצא" },
        { status: 404 }
      );
    }

    // Dispatch the email with attachments / record in audit log
    const result = await sendStatusNotificationEmail({
      candidateId,
      completedByUserEmail,
      stageId,
    });

    // Generate client-side mailto link with the exact subject and body
    const mailtoLink = createMailtoLink(result.recipient, result.subject, result.body);

    return NextResponse.json({
      success: true,
      message: result.message,
      recipient: result.recipient,
      recipientEmail: result.recipient,
      subject: result.subject,
      body: result.body,
      mailtoUrl: mailtoLink,
      mailtoLink,
      attachmentsCount: result.attachmentsCount,
      data: {
        ...result,
        mailtoLink,
        mailtoUrl: mailtoLink,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error?.message || "שגיאה בשליחת הודעת סיום הטפסים",
      },
      { status: 500 }
    );
  }
}
