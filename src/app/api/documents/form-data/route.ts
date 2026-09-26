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

    // 1. Merge answers from ANY other filled documents of this candidate as base
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

    // 3. Fallback to candidate profile data
    const candidate = await sheetsRepository.getCandidateById(candidateId);
    if (candidate) {
      if (candidate.signature_url && !parsedData.signatureDataUrl) {
        parsedData.signatureDataUrl = candidate.signature_url;
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
