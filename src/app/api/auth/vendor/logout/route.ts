import { NextResponse } from "next/server";
import { clearVendorAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  clearVendorAuthCookie();

  // If invoked via fetch/AJAX expecting JSON
  const acceptHeader = request.headers.get("accept") || "";
  if (acceptHeader.includes("application/json")) {
    return NextResponse.json({ success: true, redirectUrl: "/" });
  }

  // Standard HTML form submission: redirect directly to root login screen
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/", url.origin), { status: 303 });
}

export async function GET(request: Request) {
  clearVendorAuthCookie();
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/", url.origin), { status: 303 });
}
