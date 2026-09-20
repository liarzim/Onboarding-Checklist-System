import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const VENDOR_AUTH_COOKIE_NAME = "vendor_session";
const ADMIN_AUTH_COOKIE_NAME = "admin_session";

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_key_at_least_32_characters_long";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secretKey = getJwtSecretKey();

  // 1. Admin and HR Route Protection
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // Allow access to login page
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const adminToken = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value;
    let isAdminValid = false;
    let adminData: { user_id: string; role: string; email: string } | null = null;

    if (adminToken) {
      try {
        const { payload } = await jwtVerify(adminToken, secretKey);
        if (
          typeof payload.user_id === "string" &&
          (payload.role === "HR" || payload.role === "Admin")
        ) {
          isAdminValid = true;
          adminData = {
            user_id: payload.user_id,
            role: payload.role,
            email: String(payload.email || ""),
          };
        }
      } catch {
        isAdminValid = false;
      }
    }

    if (!isAdminValid || !adminData) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "HR or Admin session required for this operation.",
          },
          { status: 401 }
        );
      }

      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // RBAC: Check if route requires strictly 'Admin' role
    const requiresAdminRole =
      pathname.startsWith("/admin/settings") ||
      pathname.startsWith("/admin/audit-log") ||
      pathname.startsWith("/api/admin/settings") ||
      pathname.startsWith("/api/admin/audit-log");

    if (requiresAdminRole && adminData.role !== "Admin") {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "Admin role required for settings and audit log access.",
          },
          { status: 403 }
        );
      }

      const deniedUrl = new URL("/admin?error=forbidden", request.url);
      return NextResponse.redirect(deniedUrl);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-id", adminData.user_id);
    requestHeaders.set("x-admin-role", adminData.role);
    requestHeaders.set("x-admin-email", adminData.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Vendor Route Protection
  if (
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/api/vendor/") ||
    pathname.startsWith("/api/documents/")
  ) {
    const vendorToken = request.cookies.get(VENDOR_AUTH_COOKIE_NAME)?.value;
    let isVendorValid = false;
    let vendorData: {
      vendor_id: string;
      company_name: string;
      email: string;
      role: string;
    } | null = null;

    if (vendorToken) {
      try {
        const { payload } = await jwtVerify(vendorToken, secretKey);
        if (
          typeof payload.vendor_id === "string" &&
          typeof payload.company_name === "string" &&
          typeof payload.email === "string" &&
          payload.role === "Vendor"
        ) {
          isVendorValid = true;
          vendorData = {
            vendor_id: payload.vendor_id,
            company_name: payload.company_name,
            email: payload.email,
            role: payload.role,
          };
        }
      } catch {
        isVendorValid = false;
      }
    }

    if (pathname.startsWith("/api/vendor/") || pathname.startsWith("/api/documents/")) {
      if (!isVendorValid || !vendorData) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "A valid vendor session is required to access this endpoint.",
          },
          { status: 401 }
        );
      }

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-vendor-id", vendorData.vendor_id);
      requestHeaders.set("x-vendor-email", vendorData.email);
      requestHeaders.set("x-vendor-company", encodeURIComponent(vendorData.company_name));

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    if (pathname.startsWith("/vendor")) {
      if (!isVendorValid || !vendorData) {
        const loginUrl = new URL("/", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-vendor-id", vendorData.vendor_id);
      requestHeaders.set("x-vendor-email", vendorData.email);
      requestHeaders.set("x-vendor-company", encodeURIComponent(vendorData.company_name));

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/vendor/:path*",
    "/api/vendor/:path*",
    "/api/documents/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
