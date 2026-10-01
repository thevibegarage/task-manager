// End-to-end API validation against a running server.
//   npm run dev   (or npm run build && npm start)
//   npm run test:e2e            # BASE_URL defaults to http://localhost:3000
// Test students use the @e2e.test domain and are deleted afterwards.
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { letterIndex, MAX_SCORE, questionSeed } from "../prisma/seed-data";
import type { PublicAssessment } from "../types";

process.loadEnvFile?.(".env");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, detail ?? "");
  }
}

const FORBIDDEN_KEY = /correct|answer_?key|points|scoring|is_?correct/i;
function forbiddenKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => forbiddenKeys(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => [
      ...(FORBIDDEN_KEY.test(k) ? [`${path}.${k}`] : []),
      ...forbiddenKeys(v, `${path}.${k}`),
    ]);
  }
  return [];
}

const getAssessment = async () => (await (await fetch(`${BASE}/api/assessment`)).json()) as PublicAssessment;

/** Maps option text → option ID per question for a given (shuffled) assessment payload. */
function idsFor(a: PublicAssessment, qIndex: number, letters: string[]) {
  const q = a.questions[qIndex];
  return letters.map((l) => q.options.find((o) => o.text === questionSeed[qIndex].options[letterIndex(l)])!.id);
}
const perfect = (a: PublicAssessment) =>
  a.questions.map((q, i) => ({ questionId: q.id, selectedOptionIds: idsFor(a, i, questionSeed[i].correct) }));
const wrongLetter = (i: number) =>
  String.fromCharCode(65 + questionSeed[i].options.findIndex((_, oi) => !questionSeed[i].correct.map(letterIndex).includes(oi)));

async function submit(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}
const student = (tag: string) => ({ name: `E2E ${tag}`, email: `${tag}-${Date.now()}@e2e.test` });

async function login(password = process.env.ADMIN_PASSWORD) {
  return fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password }),
  });
}

async function main() {
  console.log(`E2E against ${BASE}\n`);

  console.log("Student API");
  const home = await fetch(BASE);
  check("home page loads", home.ok);
  const a = await getAssessment();
  check("15 questions in Q1–Q15 order", a.questions.length === 15 && a.questions.every((q, i) => q.number === i + 1));
  const leaks = forbiddenKeys(a);
  check("GET /api/assessment exposes no correctness/points keys", leaks.length === 0, leaks);
  check(
    "questions/options expose only allow-listed fields",
    a.questions.every(
      (q) =>
        Object.keys(q).sort().join() === "id,number,options,selectCount,text,type" &&
        q.options.every((o) => Object.keys(o).sort().join() === "id,text"),
    ),
  );
  check(
    "multi-select questions report how many to select",
    a.questions.every((q, i) => q.selectCount === (questionSeed[i].type === "single" ? 1 : questionSeed[i].correct.length)),
  );

  const samples = await Promise.all(Array.from({ length: 8 }, getAssessment));
  const orders = new Set(samples.map((s) => s.questions.map((q) => q.options.map((o) => o.id).join()).join("|")));
  check("answer options are randomised between sessions", orders.size > 1, `${orders.size} distinct orders`);
  check(
    "randomisation keeps the same stable option IDs",
    samples.every((s) => s.questions.every((q, i) => [...q.options.map((o) => o.id)].sort().join() === [...a.questions[i].options.map((o) => o.id)].sort().join())),
  );

  console.log("\nSubmission & scoring");
  // Perfect score using a *different* shuffled payload than the one used to map IDs.
  const p = student("perfect");
  const perfectId = randomUUID();
  const r1 = await submit({ submissionId: perfectId, ...p, answers: perfect(samples[3]) });
  check(`perfect answers score ${MAX_SCORE}/${MAX_SCORE} (100%)`, r1.status === 201 && r1.data.score === MAX_SCORE && r1.data.max_score === MAX_SCORE && r1.data.percentage === 100, r1);
  check("submission response exposes no answer data", forbiddenKeys(r1.data).length === 0 && !("answers" in r1.data), r1.data);

  const replay = await submit({ submissionId: perfectId, ...p, answers: [] });
  check("replaying the same submission ID returns the original result", replay.status === 201 && replay.data.submission_id === perfectId && replay.data.score === MAX_SCORE, replay);
  const second = await submit({ submissionId: randomUUID(), ...p, answers: perfect(a) });
  check("a second submission with the same email is rejected (409)", second.status === 409, second);
  const dbCount = await prisma.submission.count({ where: { student: { email: p.email } } });
  check("only one submission persisted for that student", dbCount === 1, dbCount);

  const t = student("tamper");
  const tampered = await submit({
    submissionId: randomUUID(),
    ...t,
    score: 999,
    percentage: 100,
    max_score: 1,
    answers: a.questions.map((q) => ({ questionId: q.id, selectedOptionIds: [] })),
  });
  check("client-sent score is ignored (blank answers → 0)", tampered.status === 201 && tampered.data.score === 0 && tampered.data.max_score === MAX_SCORE, tampered);

  // Each question individually: answer everything correctly except question i.
  let allQuestionsOk = true;
  for (let i = 0; i < 15; i++) {
    const answers = perfect(a);
    answers[i].selectedOptionIds = idsFor(a, i, [wrongLetter(i)]);
    const r = await submit({ submissionId: randomUUID(), ...student(`q${i + 1}`), answers });
    const expected = MAX_SCORE - questionSeed[i].points;
    if (r.status !== 201 || r.data.score !== expected) {
      allQuestionsOk = false;
      console.log(`    Q${i + 1}: expected ${expected}, got`, r);
    }
  }
  check("Q1–Q15: one wrong answer deducts exactly that question's points", allQuestionsOk);

  // Spec examples on Q6 (correct A,C): A only → 0 for Q6; B,C → 0 for Q6.
  for (const letters of [["A"], ["B", "C"]]) {
    const answers = perfect(a);
    answers[5].selectedOptionIds = idsFor(a, 5, letters);
    const r = await submit({ submissionId: randomUUID(), ...student(`q6-${letters.join("")}`), answers });
    check(`Q6 selecting ${letters.join(",")} earns no partial credit`, r.data?.score === MAX_SCORE - 2, r);
  }

  console.log("\nValidation");
  const v = (overrides: Record<string, unknown>) =>
    submit({ submissionId: randomUUID(), ...student("invalid"), answers: perfect(a), ...overrides });
  check("name required", (await v({ name: "  " })).status === 400);
  check("email required", (await v({ email: "" })).status === 400);
  check("invalid email rejected", (await v({ email: "not-an-email" })).status === 400);
  const over = perfect(a);
  over[5].selectedOptionIds = idsFor(a, 5, ["A", "B", "C"]);
  check("selecting more than the allowed number is rejected", (await v({ answers: over })).status === 400);
  const single2 = perfect(a);
  single2[0].selectedOptionIds = idsFor(a, 0, ["A", "C"]);
  check("two answers on a single-select question rejected", (await v({ answers: single2 })).status === 400);
  const foreign = perfect(a);
  foreign[0].selectedOptionIds = [a.questions[1].options[0].id];
  check("option from another question rejected", (await v({ answers: foreign })).status === 400);
  check("unknown question rejected", (await v({ answers: [{ questionId: "nope", selectedOptionIds: [] }] })).status === 400);
  check("malformed JSON rejected", (await fetch(`${BASE}/api/submissions`, { method: "POST", body: "{" })).status === 400);

  console.log("\nResult page");
  const result = await fetch(`${BASE}/api/submissions/${perfectId}`).then((r) => r.json());
  check("GET result returns only the score summary", result.score === MAX_SCORE && forbiddenKeys(result).length === 0 && !("answers" in result), result);
  const before = await prisma.submission.count();
  const page1 = await (await fetch(`${BASE}/result/${perfectId}`)).text();
  await fetch(`${BASE}/result/${perfectId}`);
  check("result page shows score and message", page1.includes("Assessment Submitted") && page1.includes(`${MAX_SCORE}<!-- --> / <!-- -->${MAX_SCORE}`) && page1.includes("Excellent understanding"));
  check("refreshing the result page creates no submission", (await prisma.submission.count()) === before);
  check("unknown result ID → 404", (await fetch(`${BASE}/api/submissions/${randomUUID()}`)).status === 404);

  console.log("\nInstructor");
  check("dashboard API requires login", (await fetch(`${BASE}/api/admin/dashboard`)).status === 401);
  check("CSV export requires login", (await fetch(`${BASE}/api/admin/export`)).status === 401);
  const adminPage = await fetch(`${BASE}/admin`, { redirect: "manual" });
  check("/admin redirects to login when signed out", [303, 307, 308].includes(adminPage.status) && (adminPage.headers.get("location") ?? "").includes("/admin/login"));
  check("wrong password rejected", (await login("definitely-wrong")).status === 401);
  const ok = await login();
  const setCookie = ok.headers.get("set-cookie") ?? "";
  check("correct credentials accepted with HttpOnly session cookie", ok.ok && /HttpOnly/i.test(setCookie) && /SameSite=Strict/i.test(setCookie), setCookie);
  const cookie = setCookie.split(";")[0];
  check("forged session cookie rejected", (await fetch(`${BASE}/api/admin/dashboard`, { headers: { cookie: "admin_session=eyJzdWIiOiJ4In0.abc" } })).status === 401);

  const dash = await fetch(`${BASE}/api/admin/dashboard`, { headers: { cookie } }).then((r) => r.json());
  const all = await prisma.submission.findMany({ include: { answers: true, student: true } });
  check("dashboard total matches database", dash.summary.totalSubmissions === all.length);
  check("dashboard max score is derived from data", dash.summary.maxScore === MAX_SCORE);
  check(
    "E2E students appear in the student table",
    dash.students.some((s: { email: string }) => s.email === p.email) && dash.students.some((s: { email: string }) => s.email === t.email),
  );
  const expectedAvg = Math.round((all.reduce((s, x) => s + x.score, 0) / all.length) * 100) / 100;
  check("average score is correct", dash.summary.averageScore === expectedAvg, [dash.summary.averageScore, expectedAvg]);
  const scores = all.map((s) => s.score).sort((x, y) => x - y);
  const m = Math.floor(scores.length / 2);
  const expectedMedian = scores.length % 2 ? scores[m] : (scores[m - 1] + scores[m]) / 2;
  check("median / highest / lowest are correct", dash.summary.medianScore === expectedMedian && dash.summary.highestScore === scores.at(-1) && dash.summary.lowestScore === scores[0]);
  check("distribution sums to total", dash.distribution.reduce((s: number, d: { count: number }) => s + d.count, 0) === all.length);

  let analyticsOk = true;
  for (const q of dash.questionAnalysis) {
    const correct = all.filter((s) => s.answers.find((x) => x.questionId === q.id)?.isCorrect).length;
    const acc = Math.round((correct / all.length) * 10000) / 100;
    if (q.correct !== correct || q.accuracy !== acc) analyticsOk = false;
  }
  check("question-level correct counts and accuracy are correct", analyticsOk);
  const accs = dash.questionAnalysis.map((q: { accuracy: number }) => q.accuracy);
  check("question analysis sorted lowest → highest accuracy", accs.every((x: number, i: number) => i === 0 || accs[i - 1] <= x));

  const csvRes = await fetch(`${BASE}/api/admin/export`, { headers: { cookie } });
  const csv = await csvRes.text();
  check(
    "CSV export works",
    csvRes.ok && /text\/csv/.test(csvRes.headers.get("content-type") ?? "") && csv.startsWith("Student Name,Email,Score") && csv.includes(p.email) && csv.trim().split("\r\n").length === all.length + 1,
  );

  const logout = await fetch(`${BASE}/api/admin/logout`, { method: "POST", headers: { cookie } });
  check("logout clears the cookie", /admin_session=;/.test(logout.headers.get("set-cookie") ?? ""));
}

main()
  .catch((e) => {
    failed++;
    console.error(e);
  })
  .finally(async () => {
    const { count } = await prisma.student.deleteMany({ where: { email: { endsWith: "@e2e.test" } } });
    await prisma.$disconnect();
    console.log(`\nCleaned up ${count} test students.`);
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
