import "server-only";
import { createHash, createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  }
  return secret;
}

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest();

/**
 * ADMIN_PASSWORD may be plaintext or a scrypt hash ("scrypt$<salt>$<hash>", produced by
 * `npm run hash-password`). Comparisons are constant-time.
 */
export function verifyAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;

  const emailOk = safeEqual(sha256(email.trim().toLowerCase()), sha256(adminEmail));

  let passwordOk: boolean;
  if (adminPassword.startsWith("scrypt$")) {
    const [, saltB64, hashB64] = adminPassword.split("$");
    const expected = Buffer.from(hashB64 ?? "", "base64url");
    const actual = scryptSync(password, Buffer.from(saltB64 ?? "", "base64url"), expected.length || 64);
    passwordOk = safeEqual(actual, expected);
  } else {
    passwordOk = safeEqual(sha256(password), sha256(adminPassword));
  }
  return emailOk && passwordOk;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(email: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: email.toLowerCase(), exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): { email: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!safeEqual(Buffer.from(signature), Buffer.from(sign(payload)))) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof sub !== "string" || typeof exp !== "number" || exp * 1000 < now) return null;
    // Invalidate sessions if the configured admin changes.
    if (sub !== process.env.ADMIN_EMAIL?.trim().toLowerCase()) return null;
    return { email: sub };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

/** Returns the admin session from the request cookies, or null. */
export async function getAdminSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

// Basic in-memory brute-force protection for the login endpoint (per server instance).
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export function loginRateLimited(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}
