import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import type { StatusEmailTemplate } from "@/types/emailTemplates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized", message: "נדרשת הזדהות מנהל מערכת" },
        { status: 401 }
      );
    }

    const templates = await sheetsRepository.getStatusEmailTemplates();
    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error?.message || "שגיאה בטעינת תבניות מייל",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized", message: "נדרשת הזדהות מנהל מערכת" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const templates = body.templates as Record<string, StatusEmailTemplate>;

    if (!templates || typeof templates !== "object") {
      return NextResponse.json(
        { error: "Validation Error", message: "מבנה נתונים שגוי עבור תבניות מייל" },
        { status: 400 }
      );
    }

    await sheetsRepository.saveStatusEmailTemplates(templates);

    // Record audit log
    await sheetsRepository.appendAuditLog({
      log_id: `log_templates_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: adminSession.email,
      actor_role: adminSession.role,
      action_type: "UPDATE_STATUS_EMAIL_TEMPLATES",
      entity_type: "SystemSettings",
      entity_id: "status_email_templates_json",
      details: `עודכנו תבניות הודעות מייל עבור ${Object.keys(templates).length} סטאטוסים`,
    });

    return NextResponse.json({
      success: true,
      message: "תבניות המייל לסטאטוסים נשמרו בהצלחה",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error?.message || "שגיאה בשמירת תבניות מייל",
      },
      { status: 500 }
    );
  }
}
