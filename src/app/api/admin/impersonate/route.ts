import { NextResponse } from "next/server";
import { getAdminSession, signVendorToken, signAdminToken, VENDOR_AUTH_COOKIE_NAME, ADMIN_AUTH_COOKIE_NAME } from "@/lib/auth";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const target = body?.target;

    const cookieStore = cookies();
    const isProduction = process.env.NODE_ENV === "production";

    if (target === "vendor") {
      // 1. Fetch vendors list to pick requested or fallback vendor
      const vendors = await sheetsRepository.getVendors();
      const reqVendorId = body?.vendor_id;
      let targetVendor = vendors.find((v) => v.vendor_id === reqVendorId);

      if (!targetVendor) {
        // Fallback to first active vendor or default test vendor
        targetVendor = vendors.find((v) => v.is_active) || vendors[0] || {
          vendor_id: "vendor_1",
          company_name: "חברת אלפא טכנולוגיות בע״מ (ספק בדיקה)",
          contact_name: "איש קשר בדיקה",
          contact_email: session.email,
          is_active: true,
          created_at: new Date().toISOString(),
        };
      }

      // Generate vendor session token
      const vendorToken = await signVendorToken({
        vendor_id: targetVendor.vendor_id,
        company_name: targetVendor.company_name,
        email: targetVendor.contact_email || session.email,
        role: "Vendor",
      });

      cookieStore.set(VENDOR_AUTH_COOKIE_NAME, vendorToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });

      cookieStore.set("impersonation_active", "vendor", {
        httpOnly: false,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });

      return NextResponse.json({
        success: true,
        redirectUrl: "/vendor",
        vendor_name: targetVendor.company_name,
      });
    }

    if (target === "hr") {
      // Switch admin session role to HR
      const hrToken = await signAdminToken({
        user_id: session.user_id,
        full_name: session.full_name,
        email: session.email,
        role: "HR",
      });

      cookieStore.set(ADMIN_AUTH_COOKIE_NAME, hrToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });

      cookieStore.set("impersonation_active", "hr", {
        httpOnly: false,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });

      return NextResponse.json({
        success: true,
        redirectUrl: "/admin",
      });
    }

    if (target === "admin_restore") {
      // Restore Admin role
      const adminToken = await signAdminToken({
        user_id: session.user_id,
        full_name: session.full_name,
        email: session.email,
        role: "Admin",
      });

      cookieStore.set(ADMIN_AUTH_COOKIE_NAME, adminToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      // Clear vendor cookie and impersonation flag
      cookieStore.set(VENDOR_AUTH_COOKIE_NAME, "", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      cookieStore.set("impersonation_active", "", {
        httpOnly: false,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      return NextResponse.json({
        success: true,
        redirectUrl: "/admin",
      });
    }

    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impersonation error";
    return NextResponse.json({ error: "Server Error", message }, { status: 500 });
  }
}
