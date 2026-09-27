import { NextResponse } from "next/server";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { CANDIDATE_EXTENDED_COLUMNS } from "@/types/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sheetsRepository.ensureSheetHeaders();
    return NextResponse.json({
      success: true,
      message: "הכותרות עודכנו בהצלחה בגיליון Google Sheets (51 עמודות)",
      totalColumns: 16 + CANDIDATE_EXTENDED_COLUMNS.length,
      extendedColumns: CANDIDATE_EXTENDED_COLUMNS.map((c) => c.label),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
