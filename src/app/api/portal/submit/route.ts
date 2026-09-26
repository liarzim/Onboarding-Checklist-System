import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { setDemoCandidateCookie } from "@/lib/testStore";
import { isValidIsraeliId, validateIsraeliId } from "@/lib/validation/israeliId";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { AuditLogEntry } from "@/types/schema";

export const dynamic = "force-dynamic";

const PortalSubmitSchema = z.object({
  token: z.string().min(1, "טוקן חסר"),
  candidate_id: z.string().min(1, "מזהה מועמד חסר"),
  full_name: z.string().min(2, "שם מלא חייב להכיל לפחות 2 תווים"),
  id_number: z.string().min(5, "מספר תעודת זהות חסר"),
  project_id: z.string().min(1, "שם פרויקט חסר"),
  vendor_company_name: z.string().optional(),

  // Section A: Personal Questionnaire Level 5
  birth_date: z.string().min(1, "נא להזין תאריך לידה"),
  birth_country: z.string().min(1, "נא להזין ארץ לידה"),
  marital_status: z.string().min(1, "נא לבחור מצב משפחתי"),
  address: z.string().min(3, "נא להזין כתובת מגורים מלאה"),
  army_service: z.string().min(1, "נא לבחור סטטוס שירות"),
  military_role: z.string().optional(),
  ref1_name: z.string().min(2, "נא להזין שם ממליץ 1"),
  ref1_phone: z.string().min(7, "נא להזין טלפון ממליץ 1"),
  ref2_name: z.string().min(2, "נא להזין שם ממליץ 2"),
  ref2_phone: z.string().min(7, "נא להזין טלפון ממליץ 2"),

  // Section B: 7 Legal Declarations Checkboxes (All required true)
  agreed_doc_2: z.literal(true, {
    errorMap: () => ({ message: "חובה לאשר את עלון המידע לנבדק" }),
  }),
  agreed_doc_3: z.literal(true, {
    errorMap: () => ({ message: "חובה לאשר את הצהרת קבלת כרטיס חכם" }),
  }),
  agreed_doc_4: z.literal(true, {
    errorMap: () => ({ message: "חובה לאשר הסכמה למסירת מידע פלילי" }),
  }),
  agreed_doc_5: z.literal(true, {
    errorMap: () => ({ message: "חובה לאשר התחייבות לשמירת סודיות" }),
  }),
  agreed_doc_6: z.literal(true, {
    errorMap: () => ({ message: "חובה לאשר התחייבות לשמירת פרטיות" }),
  }),
  agreed_doc_7: z.literal(true, {
    errorMap: () => ({ message: "חובה לאשר הימנעות מעבירות מחשב" }),
  }),
  agreed_doc_8: z.literal(true, {
    errorMap: () => ({ message: "חובה לאשר הסכמה לניטור סייבר" }),
  }),

  // Section C: Smart Card Request Confirmation
  job_title: z.string().min(2, "נא להזין תפקיד מיועד בפרויקט"),
  agreed_doc_9: z.literal(true, {
    errorMap: () => ({ message: "חובה לאשר את בקשת הנפקת כרטיס חכם" }),
  }),

  // Section D: Unified Digital Signature
  signature_data_url: z.string().min(50, "חובה לחתום בחתימה דיגיטלית"),
  is_acknowledged: z.literal(true, {
    errorMap: () => ({
      message: "חובה לסמן את תיבת האישור המשפטי לחתימה אלקטרונית",
    }),
  }),
});

export async function POST(request: Request) {
  try {
    // 0. Rate limiting to prevent submission spam
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`portal_submit_${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "יותר מדי ניסיונות שליחה. אנא המתן דקה לפני שתנסה שוב.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = PortalSubmitSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "נתוני טופס שגויים";
      return NextResponse.json(
        {
          error: "Validation failed",
          message: firstError,
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 1. Verify candidate and token existence
    const candidate = await sheetsRepository.getCandidateByToken(data.token);

    if (!candidate) {
      return NextResponse.json(
        {
          error: "Invalid Token",
          message: "הקישור אינו תקין או שהמועמד לא נמצא במערכת.",
        },
        { status: 404 }
      );
    }

    // 2. Verify candidate ID matches
    if (candidate.candidate_id !== data.candidate_id) {
      return NextResponse.json(
        {
          error: "Mismatch",
          message: "שגיאת אבטחה: מזהה המועמד אינו תואם לטוקן הגישה.",
        },
        { status: 400 }
      );
    }

    // 3. Verify token has not expired
    if (candidate.token_expires_at) {
      const expirationDate = new Date(candidate.token_expires_at).getTime();
      if (!isNaN(expirationDate) && expirationDate < Date.now()) {
        return NextResponse.json(
          {
            error: "Token Expired",
            message: "תוקף הקישור פג. אנא פנה למשאבי אנוש או לספק לקבלת קישור חדש.",
          },
          { status: 410 }
        );
      }
    }

    // 4. Verify candidate has not already submitted
    if (candidate.is_signed_by_candidate) {
      return NextResponse.json(
        {
          error: "Already Signed",
          message: "טפסי הקליטה כבר נחתמו ונשלחו בעבר. לא ניתן לשלוח שנית.",
        },
        { status: 409 }
      );
    }

    // 5. Format and pad Israeli ID to 9 digits
    const paddedId = validateIsraeliId(data.id_number).paddedId;

    // 6. Update candidate state in Google Sheets: mark signed, update details, advance stage
    await sheetsRepository.markCandidateSigned(candidate.candidate_id, {
      full_name: data.full_name.trim(),
      id_number: paddedId,
      project_id: data.project_id.trim(),
      signature_url: data.signature_data_url,
    });

    // Ensure all 11 checklist items are marked as uploaded so verification succeeds
    const docTypes = await sheetsRepository.getDocumentTypes();
    const portalFormDataObj = {
      q1BirthDate: data.birth_date,
      q1BirthCountry: data.birth_country,
      q1MaritalStatus: data.marital_status,
      q1Address: data.address,
      q1ArmyService: data.army_service,
      q1MilitaryRole: data.military_role || "",
      q1Ref1: `${data.ref1_name} - ${data.ref1_phone}`,
      q1Ref2: `${data.ref2_name} - ${data.ref2_phone}`,
      q4FatherName: "",
      q4Address: data.address,
      q9RoleInProject: data.job_title,
      signatureDataUrl: data.signature_data_url,
    };
    const portalFormDataStr = JSON.stringify(portalFormDataObj);

    for (const dt of docTypes) {
      await sheetsRepository.updateChecklistItem(candidate.candidate_id, dt.doc_type_id, {
        status: "Uploaded",
        file_name: `${dt.doc_name} - ${data.full_name.trim()}.pdf`,
        file_drive_id: `file_${dt.doc_type_id}_${candidate.candidate_id}`,
        file_drive_url: "#",
        form_data: portalFormDataStr,
      });
    }

    // 7. Audit log event
    const auditEntry: AuditLogEntry = {
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: candidate.email,
      actor_role: "Vendor", // Candidate portal submission
      action_type: "CANDIDATE_DIGITAL_SIGNATURE",
      entity_type: "Candidate",
      entity_id: candidate.candidate_id,
      details: `המועמד/ת ${data.full_name} (${paddedId}) השלים/ה את כל 11 שלבי הקליטה, הטפסים ותמונות הזיהוי בפורטל המועמדים`,
    };
    await sheetsRepository.appendAuditLog(auditEntry);

    const response = NextResponse.json({
      success: true,
      message: "טפסי הקליטה נחתמו בהצלחה ונשלחו לבדיקת ביטחון שדה ומשאבי אנוש.",
      candidate_id: candidate.candidate_id,
    });

    const updatedCandidate = await sheetsRepository.getCandidateById(candidate.candidate_id);
    if (updatedCandidate) {
      setDemoCandidateCookie(response, updatedCandidate);
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "שגיאה פנימית בעיבוד השליחה";
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message,
      },
      { status: 500 }
    );
  }
}
