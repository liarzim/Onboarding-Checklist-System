import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { signVendorToken, setVendorAuthCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { AuditLogEntry, Vendor } from "@/types/schema";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  company_name: z.string().min(2, "שם חברה חייב להכיל לפחות 2 תווים"),
  contact_name: z.string().min(2, "שם איש קשר חייב להכיל לפחות 2 תווים"),
  contact_email: z.string().email("כתובת אימייל לא תקינה"),
});

export async function POST(request: Request) {
  try {
    // 0. Rate limiting to prevent abuse
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`register_vendor_${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "יותר מדי ניסיונות הרשמה. אנא המתן דקה לפני שתנסה שוב.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: parsed.error.issues[0]?.message || "נתוני הרשמה שגויים",
        },
        { status: 400 }
      );
    }

    const cleanEmail = parsed.data.contact_email.trim().toLowerCase();
    const cleanCompany = parsed.data.company_name.trim();
    const cleanContact = parsed.data.contact_name.trim();

    // 1. Check if vendor already exists with this email
    const existing = await sheetsRepository.getVendorByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "כתובת דוא\"ל זו כבר רשומה במערכת. אנא התחבר דרך לשונית ההתחברות.",
        },
        { status: 409 }
      );
    }

    // 2. Generate unique vendor_id
    const vendorId = `vendor_${Date.now()}`;
    const newVendor: Vendor = {
      vendor_id: vendorId,
      company_name: cleanCompany,
      contact_name: cleanContact,
      contact_email: cleanEmail,
      is_active: true,
    };

    // 3. Save to Google Sheets
    await sheetsRepository.saveVendor(newVendor);

    // 4. Log to Audit_Log
    const auditEntry: AuditLogEntry = {
      log_id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_email: cleanEmail,
      actor_role: "Vendor",
      action_type: "REGISTER_VENDOR",
      entity_type: "Vendor",
      entity_id: vendorId,
      details: `ספק חדש נרשם במערכת: ${cleanCompany} (${cleanEmail}) על ידי ${cleanContact}`,
    };
    await sheetsRepository.appendAuditLog(auditEntry);

    // 5. Generate JWT token and set HttpOnly cookie
    const token = await signVendorToken({
      vendor_id: newVendor.vendor_id,
      company_name: newVendor.company_name,
      email: newVendor.contact_email,
      role: "Vendor",
    });

    setVendorAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "הספק נרשם בהצלחה למערכת",
      vendor: {
        vendor_id: newVendor.vendor_id,
        company_name: newVendor.company_name,
        email: newVendor.contact_email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה ברישום הספק";
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message,
      },
      { status: 500 }
    );
  }
}
