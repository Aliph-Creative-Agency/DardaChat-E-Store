import { describe, expect, it } from "vitest";
import { agorot, formatMoney as moneyFormat } from "@/lib/money";
import { LRI, PDI } from "./bidi";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPhone,
  formatTime,
} from "./format";

const ARABIC_INDIC = /[٠-٩۰-۹]/;
const LATE_EVENING_UTC = "2026-09-26T21:30:00Z"; // 00:30 on 27 Sep in Jerusalem (UTC+3, summer time)

describe("locale formatting (UI-002, NFR-LOC-004)", () => {
  it("numbers and percents use Latin digits in both locales", () => {
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
    expect(formatNumber(1234.5, "ar")).toContain("1,234.5");
    expect(formatPercent(0.16, "en")).toBe("16%");
    expect(formatPercent(0.16, "ar")).toContain("16");
    expect(formatPercent(0.16, "ar")).not.toMatch(ARABIC_INDIC);
  });

  it("dates are in Asia/Jerusalem: a late-evening UTC instant is already the next day", () => {
    expect(formatDate(LATE_EVENING_UTC, "en")).toMatch(/^27 Sept? 2026$/);
    expect(formatDate(LATE_EVENING_UTC, "ar")).toBe("27 أيلول 2026");
    expect(formatDate(LATE_EVENING_UTC, "en", "short")).toBe("27/09/2026");
    expect(formatDate(LATE_EVENING_UTC, "en", "long")).toMatch(/^Sunday,? 27 September 2026$/);
    expect(formatTime(LATE_EVENING_UTC, "en")).toBe("00:30");
    expect(formatDateTime(LATE_EVENING_UTC, "en")).toContain("00:30");
    for (const s of [formatDate(LATE_EVENING_UTC, "ar", "long"), formatDateTime(LATE_EVENING_UTC, "ar")]) {
      expect(s).not.toMatch(ARABIC_INDIC);
      expect(s).toContain("27");
    }
  });

  it("winter time is UTC+2", () => {
    expect(formatTime("2026-01-15T22:30:00Z", "en")).toBe("00:30");
    expect(formatDate("2026-01-15T22:30:00Z", "en", "short")).toBe("16/01/2026");
  });

  it("money delegates to src/lib/money.ts (110.00 ILS)", () => {
    const amount = agorot(11000);
    expect(formatMoney(amount, "en")).toBe(moneyFormat(amount, "en"));
    expect(formatMoney(amount, "ar")).toBe(moneyFormat(amount, "ar"));
    expect(formatMoney(amount, "en")).toBe("₪110.00");
    expect(formatMoney(amount, "ar")).toContain("110.00");
  });

  it("phones display internationally inside an LTR isolate", () => {
    expect(formatPhone("+970599123456")).toBe(`${LRI}+970 599 123 456${PDI}`);
    expect(formatPhone("not a phone")).toBe(`${LRI}not a phone${PDI}`);
  });

  it("rejects invalid dates", () => {
    expect(() => formatDate("nope", "en")).toThrow(RangeError);
  });
});
