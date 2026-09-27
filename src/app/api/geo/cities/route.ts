import { NextResponse } from "next/server";
import { searchIsraeliCities } from "@/lib/geo/israeliCities";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const cities = searchIsraeliCities(query, limit);
    return NextResponse.json({
      success: true,
      cities: cities.map((c) => c.name),
      data: cities,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה בחיפוש ישוב" },
      { status: 500 }
    );
  }
}
