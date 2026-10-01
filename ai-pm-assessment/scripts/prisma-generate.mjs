// Generates the Prisma client for whichever database DATABASE_URL points at.
import { activeSchema, isPostgres, loadEnv, run } from "./lib.mjs";

loadEnv();
const schema = activeSchema();
console.log(`Prisma provider: ${isPostgres() ? "postgresql" : "sqlite"}`);
run(`npx prisma generate --schema "${schema}"`);
