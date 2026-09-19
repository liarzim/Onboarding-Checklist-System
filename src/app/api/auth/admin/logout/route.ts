import { NextResponse } from "next/server";
import { clearAdminAuthCookie, getAdminSession } from "@/lib/auth";

export async function POST() {
  clearAdminAuthCookie();
  return NextResponse.json({ success: true, message: "Admin logged out successfully" });
}

export async function GET() {
  clearAdminAuthCookie();
  return NextResponse.redirect(
    new URL("/admin/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
  );
}
