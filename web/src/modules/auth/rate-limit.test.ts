import { describe, expect, it } from "vitest";
import { clientIp, LIMITS, MemoryRateLimitStore, rateLimit, rateLimitAll } from "./rate-limit";

const t0 = new Date("2026-09-26T10:00:00Z");
const at = (ms: number) => new Date(t0.getTime() + ms);
const MIN = 60_000;

describe("rateLimit (memory store)", () => {
  it("allows 10 OTP requests per number per hour and refuses the 11th (FR-ACC-004)", async () => {
    const store = new MemoryRateLimitStore();
    const rule = { key: "otp:phone:+970591234567", ...LIMITS.otpPerTarget };
    for (let i = 0; i < 10; i++) expect((await rateLimit(store, rule, at(i * MIN))).ok).toBe(true);
    const eleventh = await rateLimit(store, rule, at(10 * MIN));
    expect(eleventh.ok).toBe(false);
    expect(eleventh.retryAfterMs).toBe(50 * MIN); // oldest hit (t0) leaves the window at t0+60m
  });

  it("window slides: after the oldest hit ages out one more is allowed", async () => {
    const store = new MemoryRateLimitStore();
    const rule = { key: "k", limit: 10, windowMs: 60 * MIN };
    for (let i = 0; i < 10; i++) await rateLimit(store, rule, at(i * MIN));
    expect((await rateLimit(store, rule, at(59 * MIN))).ok).toBe(false);
    expect((await rateLimit(store, rule, at(60 * MIN + 1))).ok).toBe(true);
    expect((await rateLimit(store, rule, at(60 * MIN + 2))).ok).toBe(false);
  });

  it("per-IP limit applies across different phone numbers", async () => {
    const store = new MemoryRateLimitStore();
    const results = [];
    for (let i = 0; i < 11; i++) {
      results.push(
        await rateLimitAll(
          store,
          [
            { key: `otp:phone:+97059100000${i}`, ...LIMITS.otpPerTarget },
            { key: "otp:ip:10.0.0.1", ...LIMITS.otpPerIp },
          ],
          at(i * 1000),
        ),
      );
    }
    expect(results.slice(0, 10).every((r) => r.ok)).toBe(true);
    expect(results[10]!.ok).toBe(false);
  });

  it("reports remaining", async () => {
    const store = new MemoryRateLimitStore();
    expect((await rateLimit(store, { key: "r", limit: 3, windowMs: MIN }, t0)).remaining).toBe(2);
  });
});

describe("clientIp", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("uses the first x-forwarded-for hop", () => {
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
  });
  it("falls back to x-real-ip then unknown", () => {
    expect(clientIp(h({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(h({}))).toBe("unknown");
  });
});
