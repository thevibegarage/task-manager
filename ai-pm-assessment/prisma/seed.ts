import { PrismaClient } from "@prisma/client";
import { assessmentSeed, letterIndex, MAX_SCORE, questionSeed } from "./seed-data";

const prisma = new PrismaClient();

// Idempotent: safe to run repeatedly. Questions and options are upserted by their
// canonical position, so option IDs (referenced by stored answers) stay stable.
async function main() {
  for (const [i, q] of questionSeed.entries()) {
    const expected = q.type === "single" ? 1 : q.correct.length;
    if (q.correct.length !== expected || q.points !== (q.type === "single" ? 1 : 2)) {
      throw new Error(`Seed data for Q${i + 1} is inconsistent`);
    }
  }
  // Max score is derived from per-question points (9 single × 1 + 6 multiple × 2 = 21).

  const assessment = await prisma.assessment.upsert({
    where: { slug: assessmentSeed.slug },
    create: { ...assessmentSeed, maxScore: MAX_SCORE },
    update: { title: assessmentSeed.title, description: assessmentSeed.description, maxScore: MAX_SCORE },
  });

  for (const [qi, q] of questionSeed.entries()) {
    const displayOrder = qi + 1;
    const data = {
      label: q.label,
      questionText: q.text,
      questionType: q.type,
      points: q.points,
    };
    const question = await prisma.question.upsert({
      where: { assessmentId_displayOrder: { assessmentId: assessment.id, displayOrder } },
      create: { ...data, assessmentId: assessment.id, displayOrder },
      update: data,
    });

    const correctIdx = new Set(q.correct.map(letterIndex));
    for (const [oi, text] of q.options.entries()) {
      const optionOrder = oi + 1;
      await prisma.option.upsert({
        where: { questionId_displayOrder: { questionId: question.id, displayOrder: optionOrder } },
        create: { questionId: question.id, displayOrder: optionOrder, optionText: text, isCorrect: correctIdx.has(oi) },
        update: { optionText: text, isCorrect: correctIdx.has(oi) },
      });
    }
    await prisma.option.deleteMany({
      where: { questionId: question.id, displayOrder: { gt: q.options.length } },
    });
  }

  console.log(`Seeded "${assessment.title}" — ${questionSeed.length} questions, max score ${MAX_SCORE}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
