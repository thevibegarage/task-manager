// Scans the built client JavaScript (.next/static) to prove the answer key is not shipped
// to browsers. Run after `npm run build`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { questionSeed } from "../prisma/seed-data";

const dir = path.join(process.cwd(), ".next", "static");
const files: string[] = [];
const walk = (d: string) =>
  readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|json|map)$/.test(p)) files.push(p);
  });
walk(dir);

const forbidden = [
  "isCorrect",
  "is_correct",
  "correct_answer",
  "answer_key",
  "answerKey",
  "scoring_rules",
  "pointsAwarded",
  "seed-data",
  // Any question or option text in the bundle would mean content was compiled in.
  ...questionSeed.flatMap((q) => [q.text.slice(0, 40), ...q.options.map((o) => o.slice(0, 40))]),
];

let failures = 0;
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const needle of forbidden) {
    if (content.includes(needle)) {
      console.error(`LEAK: "${needle}" found in ${path.relative(process.cwd(), file)}`);
      failures++;
    }
  }
}
console.log(`Scanned ${files.length} client files for ${forbidden.length} sensitive strings.`);
if (failures) process.exit(1);
console.log("OK — no answer-key data in the client bundle.");
