import { describe, expect, it } from "vitest";
import { letterIndex, MAX_SCORE, questionSeed } from "../prisma/seed-data";
import { scoreQuestion, scoreSubmission, type ScorableQuestion } from "../lib/scoring";

// Build scorable questions from the seed (option IDs = "q<n>-<letter>").
const questions: ScorableQuestion[] = questionSeed.map((q, qi) => ({
  id: `q${qi + 1}`,
  points: q.points,
  options: q.options.map((_, oi) => ({
    id: `q${qi + 1}-${String.fromCharCode(65 + oi)}`,
    isCorrect: q.correct.map(letterIndex).includes(oi),
  })),
}));
const ids = (qi: number, letters: string) => [...letters].map((l) => `q${qi}-${l}`);
const key = new Map(questionSeed.map((q, qi) => [`q${qi + 1}`, ids(qi + 1, q.correct.join(""))]));

describe("multi-select all-or-nothing (spec examples, correct = A,C)", () => {
  const q6 = questions[5]; // correct A, C — 2 points
  it.each([
    ["AC", 2],
    ["CA", 2],
    ["A", 0],
    ["ABC", 0],
    ["BC", 0],
    ["", 0],
  ])("selecting %s scores %i", (letters, expected) => {
    expect(scoreQuestion(q6, ids(6, letters)).pointsAwarded).toBe(expected);
  });
  it("ignores duplicate IDs instead of double counting", () => {
    expect(scoreQuestion(q6, ids(6, "AAC")).pointsAwarded).toBe(2);
    expect(scoreQuestion(q6, ids(6, "AA")).pointsAwarded).toBe(0);
  });
});

describe("answer key Q1–Q15", () => {
  const expectedKey = ["C", "A", "D", "B", "D", "AC", "BC", "ABD", "A", "D", "AC", "B", "C", "ABD", "ACD"];
  it("matches the specification", () => {
    expect(questionSeed.map((q) => q.correct.join(""))).toEqual(expectedKey);
  });
  it("uses 1 point for single-select and 2 for multi-select", () => {
    for (const q of questionSeed) expect(q.points).toBe(q.type === "single" ? 1 : 2);
    expect(questionSeed.filter((q) => q.type === "single")).toHaveLength(9);
    expect(questionSeed.filter((q) => q.type === "multiple")).toHaveLength(6);
  });
  it("max score is the sum of per-question points", () => {
    expect(MAX_SCORE).toBe(21);
    expect(scoreSubmission(questions, key).maxScore).toBe(21);
  });
  it("a perfect submission earns the maximum", () => {
    const r = scoreSubmission(questions, key);
    expect(r.score).toBe(MAX_SCORE);
    expect(r.percentage).toBe(100);
  });
  it("an empty submission scores 0", () => {
    expect(scoreSubmission(questions, new Map()).score).toBe(0);
  });
  it("getting exactly one question wrong deducts exactly its points", () => {
    questions.forEach((q, i) => {
      const answers = new Map(key);
      const wrong = q.options.find((o) => !o.isCorrect)!.id;
      answers.set(q.id, [wrong]);
      expect(scoreSubmission(questions, answers).score).toBe(MAX_SCORE - questionSeed[i].points);
    });
  });
  it("selecting every option on a multi-select earns nothing", () => {
    for (const q of questions.filter((_, i) => questionSeed[i].type === "multiple")) {
      expect(scoreQuestion(q, q.options.map((o) => o.id)).pointsAwarded).toBe(0);
    }
  });
  it("correctness is independent of option order (randomisation)", () => {
    const shuffled = questions.map((q) => ({ ...q, options: [...q.options].reverse() }));
    expect(scoreSubmission(shuffled, key).score).toBe(MAX_SCORE);
  });
});
