import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestDb, truncateAll } from "../../db/test-utils";
import { DbRateLimitStore, LIMITS, rateLimit } from "./rate-limit";

const { db, close } = createTestDb();
beforeAll(() => truncateAll(db));
afterAll(() => close());

it("DB store: 10 pass, 11th refused within the hour, allowed again after the window", async () => {
  const store = new DbRateLimitStore(db);
  const t0 = new Date("2026-09-26T10:00:00Z");
  const rule = { key: "otp:phone:+970591234567", ...LIMITS.otpPerTarget };
  for (let i = 0; i < 10; i++) {
    expect((await rateLimit(store, rule, new Date(t0.getTime() + i * 60_000))).ok).toBe(true);
  }
  const refused = await rateLimit(store, rule, new Date(t0.getTime() + 30 * 60_000));
  expect(refused.ok).toBe(false);
  expect(refused.retryAfterMs).toBe(30 * 60_000);
  expect((await rateLimit(store, rule, new Date(t0.getTime() + 60 * 60_000 + 1))).ok).toBe(true);
});

it("DB store: concurrent hits never exceed the limit", async () => {
  const store = new DbRateLimitStore(db);
  const now = new Date("2026-09-26T12:00:00Z");
  const results = await Promise.all(
    Array.from({ length: 15 }, () => rateLimit(store, { key: "race", limit: 10, windowMs: 60_000 }, now)),
  );
  expect(results.filter((r) => r.ok)).toHaveLength(10);
});
