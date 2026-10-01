import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/analytics";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getDashboardData();
  if (!data) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
