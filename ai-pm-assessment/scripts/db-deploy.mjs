// Creates/updates the database schema and seeds the assessment (idempotent).
//   SQLite   -> prisma migrate deploy (uses committed migrations)
//   Postgres -> prisma db push        (schema sync; no provider-specific migrations needed)
import { activeSchema, isPostgres, loadEnv, run } from "./lib.mjs";

loadEnv();
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env (or run `npm run dev` once).");
  process.exit(1);
}
const schema = activeSchema();
if (isPostgres()) {
  run(`npx prisma db push --schema "${schema}" --skip-generate`);
} else {
  run(`npx prisma migrate deploy --schema "${schema}"`);
}
run("npx tsx prisma/seed.ts");
