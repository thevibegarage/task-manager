import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, verifyAdminCredentials, verifySessionToken } from "../lib/auth";
import { csvCell, toCsv } from "../lib/csv";
import { resultMessage } from "../lib/result-message";
import { median } from "../lib/analytics";
import { submissionSchema } from "../lib/validation";
import { shuffle } from "../lib/shuffle";

beforeAll(() => {
  process.env.ADMIN_EMAIL = "Prof@School.edu";
  process.env.ADMIN_PASSWORD = "s3cret-pass";
  process.env.SESSION_SECRET = "x".repeat(40);
});

describe("admin auth", () => {
  it("accepts the configured credentials (email case-insensitive)", () => {
    expect(verifyAdminCredentials("prof@school.edu", "s3cret-pass")).toBe(true);
    expect(verifyAdminCredentials("prof@school.edu", "wrong")).toBe(false);
    expect(verifyAdminCredentials("other@school.edu", "s3cret-pass")).toBe(false);
  });
  it("supports scrypt-hashed passwords", async () => {
    const { randomBytes, scryptSync } = await import("node:crypto");
    const salt = randomBytes(16);
    const prev = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = `scrypt$${salt.toString("base64url")}$${scryptSync("hashed!", salt, 64).toString("base64url")}`;
    expect(verifyAdminCredentials("prof@school.edu", "hashed!")).toBe(true);
    expect(verifyAdminCredentials("prof@school.edu", "nope")).toBe(false);
    process.env.ADMIN_PASSWORD = prev;
  });
  it("issues tokens that verify, expire, and resist tampering", () => {
    const token = createSessionToken("prof@school.edu");
    expect(verifySessionToken(token)).toEqual({ email: "prof@school.edu" });
    expect(verifySessionToken(token, Date.now() + 9 * 3600 * 1000)).toBeNull();
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "prof@school.edu", exp: 9999999999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`)).toBeNull();
    expect(verifySessionToken(`${payload}.AAAA`)).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });
});

describe("submission validation", () => {
  const base = {
    submissionId: crypto.randomUUID(),
    name: "  Asha  ",
    email: " Asha@Example.COM ",
    answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }],
  };
  it("normalises and strips client-supplied scores", () => {
    const parsed = submissionSchema.parse({ ...base, score: 21, percentage: 100, max_score: 21 });
    expect(parsed).not.toHaveProperty("score");
    expect(parsed).not.toHaveProperty("percentage");
    expect(parsed.name).toBe("Asha");
    expect(parsed.email).toBe("asha@example.com");
  });
  it("requires name, valid email and a UUID submission ID", () => {
    expect(submissionSchema.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, email: "" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, submissionId: "123" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("result message bands", () => {
    expect(resultMessage(100)).toMatch(/^Excellent/);
    expect(resultMessage(90)).toMatch(/^Excellent/);
    expect(resultMessage(89.9)).toMatch(/^Strong/);
    expect(resultMessage(80)).toMatch(/^Strong/);
    expect(resultMessage(70)).toMatch(/^Good/);
    expect(resultMessage(60)).toMatch(/^Developing/);
    expect(resultMessage(59.99)).toMatch(/^Several/);
  });
  it("median", () => {
    expect(median([])).toBe(0);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it("CSV escaping and formula-injection guard", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-3)).toBe("-3");
    expect(toCsv([["a", 1], ["b", 2]])).toBe("a,1\r\nb,2\r\n");
  });
  it("shuffle keeps the same elements", () => {
    const items = [1, 2, 3, 4, 5];
    expect([...shuffle(items)].sort()).toEqual(items);
    const orders = new Set(Array.from({ length: 50 }, () => shuffle(items).join("")));
    expect(orders.size).toBeGreaterThan(1);
  });
});
