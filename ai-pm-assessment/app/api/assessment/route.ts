import { NextResponse } from "next/server";
import { getPublicAssessment } from "@/lib/assessment";

export const dynamic = "force-dynamic";

// Public. Returns questions + shuffled options only — never correctness or points.
export async function GET() {
  const assessment = await getPublicAssessment();
  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  return NextResponse.json(assessment, { headers: { "Cache-Control": "no-store" } });
}
