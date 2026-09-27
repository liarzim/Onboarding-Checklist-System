import { NextResponse } from "next/server";
import { getVendorSession, getAdminSession } from "@/lib/auth";
import { assertVendorOwnership } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { ensureAuthReady } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureAuthReady();

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidate_id");
    const docTypeId = searchParams.get("doc_type_id");
    const token =
      searchParams.get("token") || request.headers.get("x-candidate-token");

    if (!candidateId || !docTypeId) {
      return NextResponse.json(
        { error: "Validation Error", message: "חסרים פרטי מועמד או סוג מסמך" },
        { status: 400 }
      );
    }

    // Auth verification: candidate token, admin session, or vendor session
    if (token) {
      const candidateByToken = await sheetsRepository.getCandidateByToken(token);
      if (!candidateByToken || candidateByToken.candidate_id !== candidateId) {
        return NextResponse.json(
          { error: "Forbidden", message: "טוקן מועמד אינו תקין או פג תוקף" },
          { status: 403 }
        );
      }
    } else {
      const adminSession = await getAdminSession();
      if (!adminSession) {
        const vendorSession = await getVendorSession();
        if (!vendorSession) {
          return NextResponse.json(
            { error: "Unauthorized", message: "נדרשת הזדהות ספק, מנהל או טוקן מועמד" },
            { status: 401 }
          );
        }
        await assertVendorOwnership(vendorSession.vendor_id, candidateId);
      }
    }

    // Retrieve checklist items for candidate
    const checklist = await sheetsRepository.getChecklist(candidateId);
    const currentItem = checklist.find((c) => c.doc_type_id === docTypeId);

    let parsedData: Record<string, any> = {};

    // 0. Base on candidate_details from Candidate record
    const candidate = await sheetsRepository.getCandidateById(candidateId);
    if (candidate) {
      if (candidate.candidate_details) {
        let detailsObj: Record<string, any> = {};
        if (typeof candidate.candidate_details === "string") {
          try {
            detailsObj = JSON.parse(candidate.candidate_details);
          } catch {
            detailsObj = {};
          }
        } else if (typeof candidate.candidate_details === "object") {
          detailsObj = candidate.candidate_details;
        }
        for (const [k, v] of Object.entries(detailsObj)) {
          if (v !== undefined && v !== null && v !== "") {
            parsedData[k] = v;
          }
        }
      }
      if (candidate.signature_url && !parsedData.signatureDataUrl) {
        parsedData.signatureDataUrl = candidate.signature_url;
      }
    }

    // 1. Merge answers from ANY other filled documents of this candidate
    for (const item of checklist) {
      if (item.form_data) {
        try {
          const itemData = JSON.parse(item.form_data);
          for (const [k, v] of Object.entries(itemData)) {
            if (v !== undefined && v !== null && v !== "") {
              parsedData[k] = v;
            }
          }
        } catch {
          // Ignore
        }
      }
    }

    // 2. Overlay specific document answers if available
    if (currentItem?.form_data) {
      try {
        const docSpecific = JSON.parse(currentItem.form_data);
        for (const [k, v] of Object.entries(docSpecific)) {
          if (v !== undefined && v !== null && v !== "") {
            parsedData[k] = v;
          }
        }
      } catch (err) {
        console.warn("Failed to parse form_data JSON:", err);
      }
    }

    const hasAnyData = Object.keys(parsedData).length > 0;

    return NextResponse.json({
      success: true,
      data: hasAnyData ? parsedData : null,
      status: currentItem?.status || "missing",
      updated_at: currentItem?.updated_at || null,
    });
  } catch (error) {
    console.error("Error in GET /api/documents/form-data:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          error instanceof Error
            ? error.message
            : "שגיאה בטעינת נתוני הטופס הקודמים",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureAuthReady();
    const body = await request.json();
    const { candidate_id, doc_type_id, form_data, token } = body;

    if (!candidate_id) {
      return NextResponse.json(
        { error: "Validation Error", message: "חסר מזהה מועמד" },
        { status: 400 }
      );
    }

    // Auth verification
    if (token) {
      const candidateByToken = await sheetsRepository.getCandidateByToken(token);
      if (!candidateByToken || candidateByToken.candidate_id !== candidate_id) {
        return NextResponse.json({ error: "Forbidden", message: "טוקן אינו תקין" }, { status: 403 });
      }
    } else {
      const adminSession = await getAdminSession();
      if (!adminSession) {
        const vendorSession = await getVendorSession();
        if (!vendorSession) {
          return NextResponse.json({ error: "Unauthorized", message: "נדרשת הזדהות" }, { status: 401 });
        }
        await assertVendorOwnership(vendorSession.vendor_id, candidate_id);
      }
    }

    if (form_data && typeof form_data === "object") {
      // 1. Sync directly to candidate profile
      await sheetsRepository.updateCandidateProfileData(candidate_id, form_data);

      // 2. If doc_type_id provided, also save to checklist item
      if (doc_type_id) {
        await sheetsRepository.updateChecklistItem(candidate_id, doc_type_id, {
          status: "Draft",
          form_data: JSON.stringify(form_data),
        });
      }
    }

    return NextResponse.json({ success: true, message: "הפרטים נשמרו בהצלחה בפרטי המועמד" });
  } catch (error) {
    console.error("Error in POST /api/documents/form-data:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "שגיאה בשמירת פרטי המועמד" },
      { status: 500 }
    );
  }
}
