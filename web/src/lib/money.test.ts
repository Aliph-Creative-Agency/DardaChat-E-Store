import { describe, expect, it } from "vitest";
import {
  add,
  agorot,
  formatMoney,
  MoneyError,
  multiply,
  nonNegativeAgorot,
  parseMoneyInput,
  subtract,
  sum,
} from "./money";

describe("agorot guard", () => {
  it("accepts safe integers, rejects fractions and non-finite", () => {
    expect(agorot(12345)).toBe(12345);
    expect(agorot(-50)).toBe(-50);
    expect(Object.is(agorot(-0), 0)).toBe(true);
    expect(() => agorot(1.5)).toThrow(MoneyError);
    expect(() => agorot(Number.NaN)).toThrow(MoneyError);
    expect(() => agorot(Number.MAX_SAFE_INTEGER + 1)).toThrow(MoneyError);
    expect(() => nonNegativeAgorot(-1)).toThrow(MoneyError);
  });

  it("does integer arithmetic", () => {
    expect(add(agorot(10), agorot(5))).toBe(15);
    expect(subtract(agorot(10), agorot(15))).toBe(-5);
    expect(sum([agorot(1), agorot(2), agorot(3)])).toBe(6);
    expect(sum([])).toBe(0);
    expect(multiply(agorot(1999), 3)).toBe(5997);
    expect(() => multiply(agorot(10), 1.5)).toThrow(MoneyError);
  });
});

describe("formatMoney", () => {
  it("formats English as ₪1,234.50", () => {
    expect(formatMoney(agorot(123450), "en")).toBe("₪1,234.50");
    expect(formatMoney(agorot(5), "en")).toBe("₪0.05");
    expect(formatMoney(agorot(0), "en")).toBe("₪0.00");
  });

  it("formats Arabic with Latin digits and the shekel sign", () => {
    const s = formatMoney(agorot(123450), "ar");
    expect(s).toContain("1,234.50");
    expect(s).toContain("₪");
    expect(s).not.toMatch(/[٠-٩]/);
  });

  it("formats negatives without float drift", () => {
    expect(formatMoney(agorot(-5), "en")).toBe("-₪0.05");
    expect(formatMoney(agorot(-12345), "en")).toBe("-₪123.45");
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    ["0.07", 7],
    ["1,234.56", 123456],
    ["₪ 99.90", 9990],
    ["١٢٫٥", 1250], // Arabic-Indic "12.5"
    ["۱۰", 1000], // extended Arabic-Indic "10"
  ])("parses %s → %i agorot", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "12,34", "-5", "1e3", "12."])("rejects %s", (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });

  it("allows negatives only when asked", () => {
    expect(parseMoneyInput("-5", { allowNegative: true })).toBe(-500);
  });
});
