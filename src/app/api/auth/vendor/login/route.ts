import { NextResponse } from "next/server";
import { z } from "zod";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { signVendorToken, setVendorAuthCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const LoginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  magicCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // 0. Rate limiting to prevent credential stuffing and brute force
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`login_vendor_${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "יותר מדי ניסיונות התחברות. אנא המתן דקה לפני שתנסה שוב.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: parsed.error.issues[0]?.message || "קלט שגוי",
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    let vendor = await sheetsRepository.getVendorByEmail(email);

    // Allow demo vendor only in development or non-production mode
    if (!vendor && process.env.NODE_ENV !== "production") {
      const allVendors = await sheetsRepository.getVendors();
      if (allVendors.length === 0) {
        vendor = {
          vendor_id: "vendor_demo",
          company_name: "חברת ספק לדוגמה בע״מ",
          contact_name: "איש קשר לדוגמה",
          contact_email: email.toLowerCase(),
          is_active: true,
        };
      }
    }

    if (!vendor) {
      return NextResponse.json(
        {
          error: "Vendor not found",
          message: "כתובת האימייל אינה משויכת לספק פעיל במערכת",
        },
        { status: 404 }
      );
    }

    if (!vendor.is_active) {
      return NextResponse.json(
        {
          error: "Vendor inactive",
          message: "חשבון הספק אינו פעיל. אנא פנה למנהל המערכת.",
        },
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = await signVendorToken({
      vendor_id: vendor.vendor_id,
      company_name: vendor.company_name,
      email: vendor.contact_email,
      role: "Vendor",
    });

    // Set HttpOnly cookie
    setVendorAuthCookie(token);

    return NextResponse.json({
      success: true,
      vendor: {
        vendor_id: vendor.vendor_id,
        company_name: vendor.company_name,
        email: vendor.contact_email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בביצוע ההתחברות";
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message,
      },
      { status: 500 }
    );
  }
}
