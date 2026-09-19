import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [vendors, stages] = await Promise.all([
      sheetsRepository.getVendors(),
      sheetsRepository.getSettingStages(),
    ]);

    return NextResponse.json({
      vendors,
      stages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בטעינת נתוני מערכת";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
