import { NextResponse } from "next/server";
import { SubmissionError, submitAssessment } from "@/lib/assessment";
import { submissionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Public. Accepts only identity + selected option IDs; the score is computed here.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const result = await submitAssessment(parsed.data);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof SubmissionError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error("Submission failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
