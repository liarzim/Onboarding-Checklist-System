import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const isCompletedFilter = status === "completed";

    // Fetch all candidates, vendors, and stages in parallel
    const [allCandidates, vendors, stages] = await Promise.all([
      sheetsRepository.getCandidates(),
      sheetsRepository.getVendors(),
      sheetsRepository.getSettingStages(),
    ]);

    // Create lookup maps
    const vendorMap = new Map(vendors.map((v) => [v.vendor_id, v.company_name]));
    const stageMap = new Map(stages.map((s) => [s.stage_id, s.stage_name]));

    // Filter candidates by completion status
    const filtered = allCandidates.filter((c) => c.is_completed === isCompletedFilter);

    // Compute checklist completion counts for each candidate
    const candidatesWithDetails = await Promise.all(
      filtered.map(async (candidate) => {
        const checklist = await sheetsRepository.getChecklist(candidate.candidate_id);
        const totalDocs = checklist.length || 9;
        const uploadedDocs = checklist.filter(
          (item) =>
            item.status === "uploaded" ||
            item.status === "Uploaded" ||
            item.status === "approved" ||
            item.status === "Approved"
        ).length;

        const vendorName = vendorMap.get(candidate.vendor_id) || candidate.vendor_id || "לא צוין";
        const stageName = stageMap.get(candidate.current_stage_id) || candidate.current_stage_id;

        return {
          ...candidate,
          vendor_name: vendorName,
          stage_name: stageName,
          uploadedDocs,
          totalDocs,
          documentsRatio: `${uploadedDocs}/${totalDocs}`,
          completionPercentage: Math.round((uploadedDocs / totalDocs) * 100),
          isReadyForIssuance: uploadedDocs === totalDocs,
        };
      })
    );

    return NextResponse.json({
      candidates: candidatesWithDetails,
      meta: {
        total: candidatesWithDetails.length,
        status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בטעינת רשימת המועמדים";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
