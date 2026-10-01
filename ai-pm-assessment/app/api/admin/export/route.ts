import { getDashboardData } from "@/lib/analytics";
import { getAdminSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminSession())) return new Response("Unauthorized", { status: 401 });
  const data = await getDashboardData();
  if (!data) return new Response("Assessment not found", { status: 404 });

  const questionNumbers = data.students[0]?.perQuestion.map((_, i) => `Q${i + 1}`) ??
    Array.from({ length: data.questionAnalysis.length }, (_, i) => `Q${i + 1}`);
  const rows = [
    ["Student Name", "Email", "Score", "Max Score", "Percentage", "Submission Time (UTC)", "Submission ID", ...questionNumbers],
    ...data.students.map((s) => [
      s.name,
      s.email,
      s.score,
      s.maxScore,
      s.percentage,
      s.submittedAt,
      s.submissionId,
      ...s.perQuestion.map((ok) => (ok ? 1 : 0)),
    ]),
  ];

  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assessment-results-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
