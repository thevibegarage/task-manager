import { NextResponse } from "next/server";
import { getSubmissionResult } from "@/lib/assessment";

export const dynamic = "force-dynamic";

// Public by unguessable submission ID. Returns only the student's own score summary.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = id.length <= 64 ? await getSubmissionResult(id) : null;
  if (!result) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
