import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Common Israeli streets that exist in almost every major Israeli municipality
const COMMON_ISRAELI_STREETS = [
  "הרצל",
  "בן גוריון",
  "ז'בוטינסקי",
  "ויצמן",
  "ביאליק",
  "רוטשילד",
  "העצמאות",
  "ירושלים",
  "סוקולוב",
  "אחד העם",
  "שדרות ירושלים",
  "הבנים",
  "הנשיא",
  "צה\"ל",
  "הפלמ\"ח",
  "ההגנה",
  "הא\"צייל",
  "התחייה",
  "השלום",
  "הירקון",
  "העלייה",
  "שפירא",
  "בר אילן",
  "רש\"י",
  "הרמב\"ם",
  "התקווה",
  "הגליל",
  "הנגב",
  "הכרמל",
  "השושנים",
  "הכלניות",
  "התאנה",
  "הרימון",
  "הזית",
  "התמר",
  "האורן",
  "הברוש",
  "האלון",
  "הדקל",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = (searchParams.get("city") || "").trim();
    const query = (searchParams.get("q") || "").trim();
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));

    let streets: string[] = [];

    // 1. Try querying data.gov.il CKAN API for official streets if city is specified
    if (city) {
      try {
        const ckanUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b&limit=25&q=${encodeURIComponent(
          query ? `${city} ${query}` : city
        )}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(ckanUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          const records = json?.result?.records || [];
          for (const rec of records) {
            const streetName = (rec.street_name || rec["שם רחוב"] || "").trim();
            if (streetName && !streets.includes(streetName)) {
              streets.push(streetName);
            }
          }
        }
      } catch {
        // Fallback to local common streets
      }
    }

    // 2. Fallback / supplementary matching using common streets
    if (streets.length === 0) {
      const filtered = COMMON_ISRAELI_STREETS.filter((s) =>
        query ? s.includes(query) : true
      );
      streets = filtered;
    }

    return NextResponse.json({
      success: true,
      city,
      streets: streets.slice(0, limit),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה בשליפת רחובות" },
      { status: 500 }
    );
  }
}
