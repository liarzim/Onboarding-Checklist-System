import { NextResponse } from "next/server";
import { getVendorSession, getAdminSession } from "@/lib/auth";
import { assertVendorOwnership, ForbiddenError, NotFoundError } from "@/lib/security";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    const vendorSession = await getVendorSession();
    let candidate: any = null;

    if (vendorSession) {
      // Validate vendor ownership
      candidate = await assertVendorOwnership(vendorSession.vendor_id, candidateId);
    } else {
      const adminSession = await getAdminSession();
      if (!adminSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      candidate = await sheetsRepository.getCandidateById(candidateId);
      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }
    }

    // Fetch checklist items and document types
    const [checklist, docTypes] = await Promise.all([
      sheetsRepository.getChecklist(candidateId),
      sheetsRepository.getDocumentTypes(),
    ]);

    // Merge docType definitions with candidate's checklist items
    const mergedItems = docTypes.map((docType) => {
      const item = checklist.find((c) => c.doc_type_id === docType.doc_type_id);
      return {
        doc_type_id: docType.doc_type_id,
        doc_name: docType.doc_name,
        is_required: docType.is_required,
        template_drive_url: docType.template_drive_url,
        order_index: docType.order_index,
        checklist_item_id: item?.checklist_item_id || `${candidateId}_${docType.doc_type_id}`,
        status: item?.status || "Not_Uploaded",
        file_name: item?.file_name || null,
        file_drive_id: item?.file_drive_id || null,
        file_drive_url: item?.file_drive_url || null,
        updated_at: item?.updated_at || candidate.created_at,
        form_data: item?.form_data || null,
      };
    });

    const uploadedCount = mergedItems.filter(
      (item) =>
        item.status === "uploaded" ||
        item.status === "Uploaded" ||
        item.status === "approved" ||
        item.status === "Approved"
    ).length;

    return NextResponse.json({
      candidate,
      items: mergedItems,
      stats: {
        total: mergedItems.length,
        uploaded: uploadedCount,
        completionPercentage: Math.round((uploadedCount / mergedItems.length) * 100),
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden", message: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not Found", message: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "שגיאה בטעינת נתוני המועמד";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
