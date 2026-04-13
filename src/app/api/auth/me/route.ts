import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ authed: false }, { status: 401 });
  return NextResponse.json({ authed: true, email: session.email });
}

