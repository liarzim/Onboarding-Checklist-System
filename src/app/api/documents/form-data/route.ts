import { NextResponse } from "next/server";
import { getVendorSession } from "@/lib/auth";
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

    // Auth verification: candidate token or vendor session
    if (token) {
      const candidateByToken = await sheetsRepository.getCandidateByToken(token);
      if (!candidateByToken || candidateByToken.candidate_id !== candidateId) {
        return NextResponse.json(
          { error: "Forbidden", message: "טוקן מועמד אינו תקין או פג תוקף" },
          { status: 403 }
        );
      }
    } else {
      const session = await getVendorSession();
      if (!session) {
        return NextResponse.json(
          { error: "Unauthorized", message: "נדרשת הזדהות ספק או טוקן מועמד" },
          { status: 401 }
        );
      }
      await assertVendorOwnership(session.vendor_id, candidateId);
    }

    // Retrieve checklist item
    const item = await sheetsRepository.getChecklistItem(candidateId, docTypeId);
    let parsedData = null;

    if (item?.form_data) {
      try {
        parsedData = JSON.parse(item.form_data);
      } catch (err) {
        console.warn("Failed to parse form_data JSON:", err);
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      status: item?.status || "missing",
      updated_at: item?.updated_at || null,
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
