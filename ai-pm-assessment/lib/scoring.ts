// Pure scoring logic. Runs on the server only (imported from lib/assessment.ts).

export type ScorableQuestion = {
  id: string;
  points: number;
  options: { id: string; isCorrect: boolean }[];
};

export type QuestionScore = {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsAwarded: number;
};

/**
 * All-or-nothing: a question earns its points only when the selected set equals the
 * correct set exactly (no missing and no extra options). No partial credit.
 */
export function scoreQuestion(question: ScorableQuestion, selected: readonly string[]): QuestionScore {
  const correct = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
  const chosen = new Set(selected);
  const isCorrect =
    correct.size > 0 && chosen.size === correct.size && [...chosen].every((id) => correct.has(id));
  return {
    questionId: question.id,
    selectedOptionIds: [...chosen],
    isCorrect,
    pointsAwarded: isCorrect ? question.points : 0,
  };
}

export function scoreSubmission(
  questions: readonly ScorableQuestion[],
  answers: ReadonlyMap<string, readonly string[]>,
) {
  const results = questions.map((q) => scoreQuestion(q, answers.get(q.id) ?? []));
  const score = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  return { results, score, maxScore, percentage: toPercentage(score, maxScore) };
}

export function toPercentage(score: number, max: number) {
  return max === 0 ? 0 : Math.round((score / max) * 10000) / 100;
}
