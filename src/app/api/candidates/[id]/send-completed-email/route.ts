import { NextResponse } from "next/server";
import { getVendorSession, getAdminSession } from "@/lib/auth";
import { assertVendorOwnership } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { sendStatusNotificationEmail } from "@/lib/email/emailDispatcher";
import { createMailtoLink } from "@/lib/email/emailTemplateEngine";

export const dynamic = "force-dynamic";

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

    // Dispatch the email with attachments
    const result = await sendStatusNotificationEmail({
      candidateId,
      completedByUserEmail,
      stageId,
    });

    // Generate client-side mailto fallback link with the exact subject and body
    const mailtoLink = createMailtoLink(result.recipient, result.subject, result.body);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        mailtoLink,
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
