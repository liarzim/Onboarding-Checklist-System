import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { createCandidateFolder, deleteCandidateFolder, cleanupOrphanedDriveFolders } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidateId = params.id;
    let candidate = await sheetsRepository.getCandidateById(candidateId);

    if (!candidate) {
      return NextResponse.json(
        { error: "Not Found", message: `מועמד עם מזהה "${candidateId}" לא נמצא` },
        { status: 404 }
      );
    }

    // Auto-heal Drive folder: if created as local mock or missing, attempt to create real Drive folder
    if (!candidate.drive_folder_id || candidate.drive_folder_id.startsWith("test_drive_folder_")) {
      try {
        const newFolderId = await createCandidateFolder(candidate.full_name, candidate.candidate_id);
        if (newFolderId && !newFolderId.startsWith("test_drive_folder_")) {
          candidate = { ...candidate, drive_folder_id: newFolderId };
          await sheetsRepository.updateCandidateDriveFolder(candidate.candidate_id, newFolderId);
        }
      } catch {
        // Keep existing fallback
      }
    }

    const [vendor, stages, docTypes, checklist] = await Promise.all([
      sheetsRepository.getVendorById(candidate.vendor_id),
      sheetsRepository.getSettingStages(),
      sheetsRepository.getDocumentTypes(),
      sheetsRepository.getChecklist(candidateId),
    ]);

    // Merge document types with candidate checklist items
    const mergedChecklist = docTypes.map((docType) => {
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
      };
    });

    const uploadedCount = mergedChecklist.filter(
      (item) =>
        item.status === "uploaded" ||
        item.status === "Uploaded" ||
        item.status === "approved" ||
        item.status === "Approved"
    ).length;

    const totalCount = mergedChecklist.length || 9;
    const allRequiredUploaded = mergedChecklist
      .filter((i) => i.is_required)
      .every(
        (i) =>
          i.status === "uploaded" ||
          i.status === "Uploaded" ||
          i.status === "approved" ||
          i.status === "Approved"
      );

    return NextResponse.json({
      candidate,
      vendor: vendor || {
        vendor_id: candidate.vendor_id,
        company_name: candidate.vendor_id,
        contact_name: "לא צוין",
        contact_email: "",
        is_active: true,
      },
      stages,
      checklist: mergedChecklist,
      stats: {
        total: totalCount,
        uploaded: uploadedCount,
        documentsRatio: `${uploadedCount}/${totalCount}`,
        completionPercentage: Math.round((uploadedCount / totalCount) * 100),
        canComplete: allRequiredUploaded && !candidate.is_completed,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בטעינת נתוני המועמד";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidateId = params.id;
    // 1. Retrieve candidate to get their folder ID before removing
    const candidate = await sheetsRepository.getCandidateById(candidateId);
    const folderId = candidate?.drive_folder_id;

    // 2. Delete candidate from Sheets and local store
    await sheetsRepository.deleteCandidate(candidateId);

    // 3. Delete candidate folder from Google Drive
    await deleteCandidateFolder(folderId, candidateId);

    // 4. Background cleanup of any other orphaned candidate folders
    try {
      const remainingCandidates = await sheetsRepository.getCandidates();
      const activeIds = remainingCandidates.map((c) => c.candidate_id);
      cleanupOrphanedDriveFolders(activeIds).catch(() => {});
    } catch {}

    const response = NextResponse.json({
      success: true,
      message: "המועמד ותיקיית ה-Drive שלו נמחקו בהצלחה",
    });

    // Remove candidate from demo_candidates cookie
    try {
      const cookieStore = cookies();
      const rawCookie = cookieStore.get("demo_candidates")?.value;
      if (rawCookie) {
        const decoded = decodeURIComponent(rawCookie);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((c: any) => c.candidate_id !== candidateId);
          if (filtered.length > 0) {
            response.cookies.set("demo_candidates", encodeURIComponent(JSON.stringify(filtered)), {
              path: "/",
              maxAge: 7 * 24 * 60 * 60,
              sameSite: "lax",
            });
          } else {
            response.cookies.delete("demo_candidates");
          }
        }
      }
    } catch {}

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה במחיקת המועמד";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
