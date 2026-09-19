import { NextResponse } from "next/server";
import { getVendorSession } from "@/lib/auth";

export async function GET() {
  const session = await getVendorSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    vendor: session,
  });
}
