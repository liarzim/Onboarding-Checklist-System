import { NextResponse } from "next/server";
import { searchIsraeliCities, ISRAELI_CITIES } from "@/lib/geo/israeliCities";

export const dynamic = "force-dynamic";

// In-memory cache for official city streets: cityKey -> { timestamp, streets }
interface CacheEntry {
  timestamp: number;
  streets: string[];
}

const CITY_STREETS_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Common Israeli streets fallback (if government API is completely unreachable)
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
  "האצ\"ל",
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

/**
 * Normalizes text by removing common prefixes (רח', רחוב, שדרות וכו')
 * and removing quotes, apostrophes, and multiple spaces.
 */
function normalizeStreetText(str: string): string {
  return str
    .replace(/^(רחוב|רח'|רח|שדרות|שד'|שד|סמטת|סמטה|דרך)\s+/gi, "")
    .replace(/['"״׳`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalizes academic and military titles commonly found in Israeli street names
 */
function normalizeStreetTitles(str: string): string {
  return str
    .replace(/פרופסור/g, "פרופ")
    .replace(/דוקטור/g, "דר")
    .replace(/ד"ר/g, "דר");
}

/**
 * Scores how well a street matches a given search query
 */
function scoreStreetMatch(street: string, rawQuery: string): number {
  if (!rawQuery) return 100;

  const normStreet = normalizeStreetTitles(normalizeStreetText(street));
  const normQuery = normalizeStreetTitles(normalizeStreetText(rawQuery));

  if (!normQuery) return 100;
  if (normStreet === normQuery) return 1000;
  if (normStreet.startsWith(normQuery)) return 500;
  if (normStreet.includes(normQuery)) return 200;

  const words = normQuery.split(" ").filter(Boolean);
  if (words.length > 0 && words.every((w) => normStreet.includes(w))) {
    return 100;
  }
  return 0;
}

/**
 * Resolves municipality code (סמל ישוב) from city name
 */
function findCityCode(cityName: string): number | undefined {
  if (!cityName) return undefined;
  const clean = cityName.trim();

  // 1. Exact match in official list
  const exact = ISRAELI_CITIES.find(
    (c) =>
      c.name === clean ||
      c.name.replace(/\s*-\s*/g, " ") === clean.replace(/\s*-\s*/g, " ")
  );
  if (exact) return exact.code;

  // 2. Prefix or fuzzy search in official list
  const matches = searchIsraeliCities(clean, 5);
  if (matches.length > 0) {
    return matches[0].code;
  }

  return undefined;
}

/**
 * Fetches the full street list for a given city from data.gov.il CKAN API
 */
async function fetchStreetsForCityFromGov(
  cityName: string,
  cityCode?: number
): Promise<string[]> {
  const streets: string[] = [];
  const seen = new Set<string>();

  const tryUrls: string[] = [];

  // Priority 1: Query by official municipality code (סמל_ישוב)
  if (cityCode && cityCode > 0) {
    tryUrls.push(
      `https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b&limit=3500&filters=${encodeURIComponent(
        JSON.stringify({ סמל_ישוב: cityCode })
      )}`
    );
  }

  // Priority 2: Query by city name (שם_ישוב)
  if (cityName) {
    tryUrls.push(
      `https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b&limit=3500&filters=${encodeURIComponent(
        JSON.stringify({ שם_ישוב: cityName.trim() })
      )}`
    );
  }

  for (const url of tryUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "application/json",
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const records = json?.result?.records || [];
        for (const rec of records) {
          // data.gov.il returns fields with underscores: שם_רחוב, סמל_רחוב
          const streetName = (
            rec["שם_רחוב"] ||
            rec["שם רחוב"] ||
            rec.street_name ||
            ""
          ).trim();
          if (streetName && !seen.has(streetName)) {
            seen.add(streetName);
            streets.push(streetName);
          }
        }
        if (streets.length > 0) {
          return streets;
        }
      }
    } catch {
      // Continue to next URL attempt if any error occurs
    }
  }

  return streets;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = (searchParams.get("city") || "").trim();
    const query = (searchParams.get("q") || "").trim();
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "15", 10))
    );

    let cityStreets: string[] = [];

    if (city) {
      const cacheKey = city.toLowerCase();
      const cached = CITY_STREETS_CACHE.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.timestamp < CACHE_TTL_MS &&
        cached.streets.length > 0
      ) {
        cityStreets = cached.streets;
      } else {
        const cityCode = findCityCode(city);
        cityStreets = await fetchStreetsForCityFromGov(city, cityCode);

        if (cityStreets.length > 0) {
          CITY_STREETS_CACHE.set(cacheKey, {
            timestamp: Date.now(),
            streets: cityStreets,
          });
        }
      }
    }

    // If city streets could not be retrieved from data.gov.il, fallback to common list
    if (cityStreets.length === 0) {
      cityStreets = COMMON_ISRAELI_STREETS;
    }

    // Filter and score matches based on user search query
    const scored = cityStreets
      .map((s) => ({ street: s, score: scoreStreetMatch(s, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.street.localeCompare(b.street, "he");
      })
      .map((item) => item.street);

    return NextResponse.json({
      success: true,
      city,
      count: scored.length,
      streets: scored.slice(0, limit),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה בשליפת רחובות" },
      { status: 500 }
    );
  }
}
