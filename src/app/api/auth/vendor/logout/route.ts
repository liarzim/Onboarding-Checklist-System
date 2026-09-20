import { NextResponse } from "next/server";
import { clearVendorAuthCookie } from "@/lib/auth";

export async function POST() {
  clearVendorAuthCookie();
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}

export async function GET() {
  clearVendorAuthCookie();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
