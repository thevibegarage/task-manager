// Runs before `npm run dev` so a fresh clone works with just `npm install && npm run dev`:
//   1. creates .env with local defaults if it is missing
//   2. creates + seeds the SQLite database if it does not exist yet
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isPostgres, loadEnv, root, run } from "./lib.mjs";

const envFile = path.join(root, ".env");
if (!existsSync(envFile)) {
  const password = randomBytes(9).toString("base64url");
  writeFileSync(
    envFile,
    [
      'DATABASE_URL="file:./dev.db"',
      'ADMIN_EMAIL="instructor@example.com"',
      `ADMIN_PASSWORD="${password}"`,
      `SESSION_SECRET="${randomBytes(32).toString("base64url")}"`,
      "",
    ].join("\n"),
  );
  console.log("\n  Created .env with local defaults.");
  console.log("  Instructor login: instructor@example.com / " + password);
  console.log("  (Change these in .env at any time.)\n");
}

loadEnv();
const url = process.env.DATABASE_URL ?? "";
if (!isPostgres(url) && url.startsWith("file:")) {
  const dbPath = path.resolve(root, "prisma", url.slice("file:".length));
  if (!existsSync(dbPath)) {
    console.log("  Local database not found — creating and seeding it.\n");
    run("node scripts/db-deploy.mjs");
  }
}
