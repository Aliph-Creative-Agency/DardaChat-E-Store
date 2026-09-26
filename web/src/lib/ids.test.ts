import { describe, expect, it } from "vitest";
import { isOrderReference, newOrderReference, newToken, normalizeOrderReference } from "./ids";

describe("order references", () => {
  it("10k references: canonical shape, no collisions, no ambiguous characters", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const ref = newOrderReference();
      expect(isOrderReference(ref)).toBe(true);
      expect(ref.slice(3)).not.toMatch(/[ILOU]/);
      seen.add(ref);
    }
    expect(seen.size).toBe(10_000);
  });

  it("normalises references typed or dictated by people", () => {
    expect(normalizeOrderReference("dc-7kq4-m2xp")).toBe("DC-7KQ4-M2XP");
    expect(normalizeOrderReference("7KQ4 M2XP")).toBe("DC-7KQ4-M2XP");
    expect(normalizeOrderReference("DC-OIL0-0000")).toBe("DC-0110-0000");
    expect(normalizeOrderReference("DC-7KQ4-M2X")).toBeNull();
    expect(normalizeOrderReference("DC-7KQ4-M2XU")).toBeNull();
  });

  it("rejects malformed references", () => {
    expect(isOrderReference("DC-7KQ4M2XP")).toBe(false);
    expect(isOrderReference("DC-7KQ4-M2XO")).toBe(false);
    expect(isOrderReference("dc-7kq4-m2xp")).toBe(false);
  });
});

describe("tokens", () => {
  it("are url-safe, long and unique", () => {
    const a = newToken();
    const b = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(() => newToken(8)).toThrow(RangeError);
  });
});
