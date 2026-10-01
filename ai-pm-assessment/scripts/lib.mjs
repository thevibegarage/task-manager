// Shared helpers for the build / setup scripts (plain Node, no dependencies).
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const sqliteSchema = path.join(root, "prisma", "schema.prisma");
export const postgresSchema = path.join(root, "prisma", "postgres", "schema.prisma");

export function loadEnv() {
  const file = path.join(root, ".env");
  if (existsSync(file) && typeof process.loadEnvFile === "function") {
    // Does not override variables already set in the environment (e.g. on Vercel).
    process.loadEnvFile(file);
  }
}

export function isPostgres(url = process.env.DATABASE_URL ?? "") {
  return /^postgres(ql)?:\/\//i.test(url);
}

/** Returns the schema path matching DATABASE_URL, generating the Postgres variant if needed. */
export function activeSchema() {
  if (!isPostgres()) return sqliteSchema;
  let schema = readFileSync(sqliteSchema, "utf8").replace(
    /provider\s*=\s*"sqlite"/,
    'provider = "postgresql"',
  );
  if (process.env.DIRECT_URL) {
    schema = schema.replace(/(url\s*=\s*env\("DATABASE_URL"\))/, '$1\n  directUrl = env("DIRECT_URL")');
  }
  mkdirSync(path.dirname(postgresSchema), { recursive: true });
  writeFileSync(
    postgresSchema,
    "// GENERATED from ../schema.prisma by scripts/lib.mjs — do not edit.\n" + schema,
  );
  return postgresSchema;
}

export function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, env: process.env });
}
