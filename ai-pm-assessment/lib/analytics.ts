import "server-only";
import { ASSESSMENT_SLUG } from "./constants";
import { prisma } from "./db";
import { toPercentage } from "./scoring";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Instructor-only analytics. Requires an authenticated admin session at the call site. */
export async function getDashboardData() {
  const assessment = await prisma.assessment.findUnique({
    where: { slug: ASSESSMENT_SLUG },
    include: {
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { options: { orderBy: { displayOrder: "asc" } } },
      },
      submissions: {
        orderBy: { submittedAt: "asc" },
        include: { student: true, answers: true },
      },
    },
  });
  if (!assessment) return null;

  const { submissions, questions } = assessment;
  const scores = submissions.map((s) => s.score);
  const total = submissions.length;

  const summary = {
    totalSubmissions: total,
    maxScore: assessment.maxScore,
    averageScore: total ? round(scores.reduce((a, b) => a + b, 0) / total) : 0,
    medianScore: median(scores),
    highestScore: total ? Math.max(...scores) : 0,
    lowestScore: total ? Math.min(...scores) : 0,
    averagePercentage: total ? round(submissions.reduce((a, s) => a + s.percentage, 0) / total) : 0,
  };

  const distribution = Array.from({ length: assessment.maxScore + 1 }, (_, score) => ({
    score,
    count: scores.filter((s) => s === score).length,
  }));

  const questionStats = questions.map((q) => {
    const answers = submissions.flatMap((s) => s.answers.filter((a) => a.questionId === q.id));
    const selections = answers.map((a) => JSON.parse(a.selectedOptionIds) as string[]);
    const responses = selections.filter((sel) => sel.length > 0).length;
    const correct = answers.filter((a) => a.isCorrect).length;
    return {
      id: q.id,
      number: q.displayOrder,
      label: q.label,
      text: q.questionText,
      type: q.questionType,
      points: q.points,
      responses,
      correct,
      // Accuracy is measured against all submissions (an unanswered question counts as incorrect).
      accuracy: toPercentage(correct, total),
      options: q.options.map((o, i) => ({
        letter: String.fromCharCode(65 + i),
        text: o.optionText,
        isCorrect: o.isCorrect,
        picks: selections.filter((sel) => sel.includes(o.id)).length,
      })),
    };
  });

  const questionAnalysis = [...questionStats].sort((a, b) => a.accuracy - b.accuracy || a.number - b.number);

  const students = submissions.map((s) => ({
    submissionId: s.id,
    name: s.student.name,
    email: s.student.email,
    score: s.score,
    maxScore: s.maxScore,
    percentage: s.percentage,
    submittedAt: s.submittedAt.toISOString(),
    // Per-question correctness in Q1–Q15 order (used by the CSV export).
    perQuestion: questions.map((q) => s.answers.find((a) => a.questionId === q.id)?.isCorrect ?? false),
  }));

  return {
    assessment: { id: assessment.id, title: assessment.title, maxScore: assessment.maxScore },
    summary,
    distribution,
    questionAnalysis,
    students,
  };
}
