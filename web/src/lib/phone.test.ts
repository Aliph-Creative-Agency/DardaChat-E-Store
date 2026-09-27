import { describe, expect, it } from "vitest";
import { formatPhoneForDisplay, maskPhone, normalizePhone, toLatinDigits } from "./phone";

const ok = (input: string, region?: string) => {
  const r = normalizePhone(input, region);
  if (!r.ok) throw new Error(`${input} → ${r.reason}`);
  return r;
};

describe("normalizePhone", () => {
  it.each([
    ["0591234567", "+970591234567", "PS"],
    ["059-123-4567", "+970591234567", "PS"],
    ["056 123 4567", "+970561234567", "PS"],
    ["+970 59 123 4567", "+970591234567", "PS"],
    ["00970591234567", "+970591234567", "PS"],
    ["(059) 123-4567", "+970591234567", "PS"],
    ["+972 52 345 6789", "+972523456789", "IL"],
    ["+962 79 123 4567", "+962791234567", "JO"],
    ["+20 10 1234 5678", "+201012345678", "EG"],
    ["+966 50 123 4567", "+966501234567", "SA"],
    ["+971 50 123 4567", "+971501234567", "AE"],
    ["+1 (201) 555-0123", "+12015550123", "US"],
    ["+44 20 7946 0958", "+442079460958", "GB"],
    ["+44 7400 123456", "+447400123456", "GB"],
  ])("%s → %s", (input, e164, region) => {
    const r = ok(input);
    expect(r.e164).toBe(e164);
    expect(r.region).toBe(region);
  });

  it("accepts Arabic-Indic digits", () => {
    expect(ok("٠٥٩١٢٣٤٥٦٧").e164).toBe("+970591234567");
    expect(ok("+٩٧٠ ٥٩ ١٢٣ ٤٥٦٧").e164).toBe("+970591234567");
  });

  it("accepts Persian digits", () => {
    expect(ok("۰۵۹۱۲۳۴۵۶۷").e164).toBe("+970591234567");
  });

  it("the three spellings of one PS number are the same account key", () => {
    const a = ok("+970 59 123 4567").e164;
    expect(ok("0097059 1234567").e164).toBe(a);
    expect(ok("0591234567").e164).toBe(a);
  });

  it("honours another default region for local input", () => {
    expect(ok("052-345-6789", "IL").e164).toBe("+972523456789");
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["+", "empty"],
    ["abc", "invalid"],
    ["059abc4567", "invalid"],
    ["059", "too_short"],
    ["+970 59 123 4567 8901 23", "too_long"],
    ["+970 11 111 1111", "invalid"],
  ])("rejects %j (%s)", (input, reason) => {
    const r = normalizePhone(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
  });

  it("rejects null/undefined as empty", () => {
    expect(normalizePhone(null)).toEqual({ ok: false, reason: "empty" });
    expect(normalizePhone(undefined)).toEqual({ ok: false, reason: "empty" });
  });
});

describe("formatPhoneForDisplay", () => {
  it("PS numbers in national 059-123-4567 style", () => {
    expect(formatPhoneForDisplay("+970591234567")).toBe("059-123-4567");
  });
  it("foreign numbers in international format with Latin digits", () => {
    expect(formatPhoneForDisplay("+442079460958")).toBe("+44 20 7946 0958");
    expect(formatPhoneForDisplay("+972523456789")).toMatch(/^\+972 /);
    expect(formatPhoneForDisplay("+972523456789")).not.toMatch(/[٠-٩]/);
  });
});

describe("maskPhone", () => {
  it("masks the middle", () => {
    expect(maskPhone("+970591234567")).toBe("+970 59•••4567");
  });
  it("never reveals the full number", () => {
    expect(maskPhone("+442079460958")).not.toContain("2079460958");
  });
});

it("toLatinDigits", () => {
  expect(toLatinDigits("٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789 0123456789");
});
