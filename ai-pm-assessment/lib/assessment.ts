import "server-only";
import { Prisma } from "@prisma/client";
import { ASSESSMENT_SLUG } from "./constants";
import { prisma } from "./db";
import { scoreSubmission } from "./scoring";
import { shuffle } from "./shuffle";
import type { SubmissionInput } from "./validation";
import type { AssessmentOverview, PublicAssessment, QuestionType, SubmissionResult } from "@/types";

export class SubmissionError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

/** Loads the assessment including the answer key. Never return this to a client. */
async function loadAssessmentWithKey() {
  return prisma.assessment.findUnique({
    where: { slug: ASSESSMENT_SLUG },
    include: {
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { options: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
}

/** Intro-screen summary (title, question count, maximum score). */
export async function getAssessmentOverview(): Promise<AssessmentOverview | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { slug: ASSESSMENT_SLUG },
    select: { title: true, description: true, maxScore: true, _count: { select: { questions: true } } },
  });
  if (!assessment) return null;
  return {
    title: assessment.title,
    description: assessment.description,
    maxScore: assessment.maxScore,
    questionCount: assessment._count.questions,
  };
}

/**
 * Student-facing view of the assessment. Fields are copied explicitly (allow-list) so
 * that is_correct / points can never leak, and option order is shuffled per request.
 * Question order is fixed (Q1–Q15).
 */
export async function getPublicAssessment(): Promise<PublicAssessment | null> {
  const assessment = await loadAssessmentWithKey();
  if (!assessment) return null;
  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    questions: assessment.questions.map((q) => ({
      id: q.id,
      number: q.displayOrder,
      text: q.questionText,
      type: q.questionType as QuestionType,
      // The UI must tell students how many to pick ("Select exactly 2 answers").
      selectCount: q.questionType === "single" ? 1 : q.options.filter((o) => o.isCorrect).length,
      options: shuffle(q.options).map((o) => ({ id: o.id, text: o.optionText })),
    })),
  };
}

function toResult(
  submission: { id: string; score: number; maxScore: number; percentage: number; submittedAt: Date },
  studentName: string,
): SubmissionResult {
  return {
    submission_id: submission.id,
    student_name: studentName,
    score: submission.score,
    max_score: submission.maxScore,
    percentage: submission.percentage,
    submitted_at: submission.submittedAt.toISOString(),
  };
}

export async function getSubmissionResult(id: string): Promise<SubmissionResult | null> {
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { student: { select: { name: true } } },
  });
  return submission ? toResult(submission, submission.student.name) : null;
}

/**
 * Validates answers against the stored assessment, scores them server-side and
 * persists the submission. Idempotent on `submissionId`: re-sending the same request
 * returns the original result instead of creating a second submission.
 */
export async function submitAssessment(input: SubmissionInput): Promise<SubmissionResult> {
  const assessment = await loadAssessmentWithKey();
  if (!assessment) throw new SubmissionError("Assessment not found", 404, "NOT_FOUND");

  // Idempotent replay (double click, network retry, refresh during submit).
  const existing = await prisma.submission.findUnique({
    where: { id: input.submissionId },
    include: { student: true },
  });
  if (existing) {
    if (existing.student.email !== input.email) {
      throw new SubmissionError("Invalid submission ID", 409, "ID_CONFLICT");
    }
    return toResult(existing, existing.student.name);
  }

  // Validate every answer against the real question/option structure.
  const questionsById = new Map(assessment.questions.map((q) => [q.id, q]));
  const answers = new Map<string, string[]>();
  for (const answer of input.answers) {
    const question = questionsById.get(answer.questionId);
    if (!question) throw new SubmissionError("Unknown question", 400, "INVALID_ANSWER");
    if (answers.has(question.id)) throw new SubmissionError("Duplicate answer", 400, "INVALID_ANSWER");
    const selected = [...new Set(answer.selectedOptionIds)];
    const validIds = new Set(question.options.map((o) => o.id));
    if (!selected.every((id) => validIds.has(id))) {
      throw new SubmissionError("Unknown option", 400, "INVALID_ANSWER");
    }
    const maxSelections =
      question.questionType === "single" ? 1 : question.options.filter((o) => o.isCorrect).length;
    if (selected.length > maxSelections) {
      throw new SubmissionError(
        `Question ${question.displayOrder} allows at most ${maxSelections} selection(s)`,
        400,
        "INVALID_ANSWER",
      );
    }
    answers.set(question.id, selected);
  }

  const { results, score, maxScore, percentage } = scoreSubmission(assessment.questions, answers);

  try {
    return await prisma.$transaction(async (tx) => {
      const student = await tx.student.upsert({
        where: { email: input.email },
        create: { name: input.name, email: input.email },
        update: { name: input.name },
      });
      const prior = await tx.submission.findUnique({
        where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: student.id } },
      });
      if (prior) {
        throw new SubmissionError(
          "An assessment has already been submitted with this email address.",
          409,
          "ALREADY_SUBMITTED",
        );
      }
      const submission = await tx.submission.create({
        data: {
          id: input.submissionId,
          assessmentId: assessment.id,
          studentId: student.id,
          score,
          maxScore,
          percentage,
          answers: {
            create: results.map((r) => ({
              questionId: r.questionId,
              selectedOptionIds: JSON.stringify(r.selectedOptionIds),
              isCorrect: r.isCorrect,
              pointsAwarded: r.pointsAwarded,
            })),
          },
        },
      });
      return toResult(submission, student.name);
    });
  } catch (e) {
    // Concurrent duplicate request won the race on a unique constraint.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await prisma.submission.findUnique({
        where: { id: input.submissionId },
        include: { student: true },
      });
      if (winner && winner.student.email === input.email) return toResult(winner, winner.student.name);
      throw new SubmissionError(
        "An assessment has already been submitted with this email address.",
        409,
        "ALREADY_SUBMITTED",
      );
    }
    throw e;
  }
}
