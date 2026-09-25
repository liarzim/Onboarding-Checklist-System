import { NextResponse } from "next/server";
import { resetTestStoreToStateZero } from "@/lib/testStore";
import { getSheetsClient } from "@/lib/google";
import { getEnv, isProduction } from "@/lib/env";
import { SHEET_NAMES } from "@/lib/repositories/sheetsRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Reset all in-memory and temporary file storage back to State 0
    resetTestStoreToStateZero();

    // 2. If in staging/dev and Google Sheets is connected, clear rows 2+
    if (!isProduction()) {
      try {
        const env = getEnv();
        const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;
        if (
          spreadsheetId &&
          spreadsheetId !== "your_google_spreadsheet_id_here" &&
          spreadsheetId.length > 5
        ) {
          const sheets = getSheetsClient();
          await Promise.allSettled([
            sheets.spreadsheets.values.clear({
              spreadsheetId,
              range: `${SHEET_NAMES.CANDIDATES}!A2:P`,
            }),
            sheets.spreadsheets.values.clear({
              spreadsheetId,
              range: `${SHEET_NAMES.CHECKLIST_ITEMS}!A2:G`,
            }),
            sheets.spreadsheets.values.clear({
              spreadsheetId,
              range: `${SHEET_NAMES.AUDIT_LOGS}!A2:G`,
            }),
          ]);
        }
      } catch (sheetErr) {
        console.warn("Could not clear sheets on reset:", sheetErr);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "סביבת ה-Staging אופסה בהצלחה למצב 0 (כל המועמדים, העוגיות ונתוני הבדיקה נוקו)!",
    });

    // 3. Clear demo cookies
    response.cookies.delete("demo_candidates");
    response.cookies.delete("impersonate_original_admin");

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה באיפוס נתוני הבדיקה";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
