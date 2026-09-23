import { NextResponse } from "next/server";
import { resetTestStoreToStateZero } from "@/lib/testStore";
import { clearAdminAuthCookie, clearVendorAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Reset all test candidates, checklist items, audit logs, and test uploaded files
    resetTestStoreToStateZero();

    // 2. Clear auth cookies to ensure complete clean slate
    clearAdminAuthCookie();
    clearVendorAuthCookie();

    return NextResponse.json({
      success: true,
      message: "כל נתוני הבדיקה, המועמדים והקבצים אופסו בהצלחה למצב 0 (מצב התחלתי נקי)!",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה באיפוס נתוני הבדיקה";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
