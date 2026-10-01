import { NextResponse } from "next/server";
import {
  clearLoginAttempts,
  createSessionToken,
  loginRateLimited,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyAdminCredentials,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Accepts JSON (from the login page script) or a native form POST (before hydration /
// without JavaScript), so credentials are never sent in a URL.
export async function POST(request: Request) {
  const isForm = !(request.headers.get("content-type") ?? "").includes("application/json");
  const fail = (error: string, status: number) =>
    isForm
      ? NextResponse.redirect(new URL(`/admin/login?error=${status === 429 ? "rate" : "invalid"}`, request.url), 303)
      : NextResponse.json({ error }, { status });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (loginRateLimited(ip)) return fail("Too many attempts. Try again in 15 minutes.", 429);

  let body: unknown = null;
  try {
    body = isForm ? Object.fromEntries(await request.formData()) : await request.json();
  } catch {
    /* handled by validation below */
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success || !verifyAdminCredentials(parsed.data.email, parsed.data.password)) {
    return fail("Invalid email or password.", 401);
  }

  clearLoginAttempts(ip);
  const response = isForm
    ? NextResponse.redirect(new URL("/admin", request.url), 303)
    : NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(parsed.data.email), sessionCookieOptions);
  return response;
}
