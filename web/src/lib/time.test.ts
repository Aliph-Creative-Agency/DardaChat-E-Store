import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  businessDate,
  businessDayRange,
  businessMonthRange,
  endOfBusinessDay,
  startOfBusinessDay,
} from "./time";

const HOUR = 3_600_000;

describe("business day boundaries (Asia/Jerusalem)", () => {
  it("winter day starts at 22:00 UTC the day before (UTC+2)", () => {
    expect(startOfBusinessDay("2026-01-15").toISOString()).toBe("2026-01-14T22:00:00.000Z");
    expect(endOfBusinessDay("2026-01-15").toISOString()).toBe("2026-01-15T22:00:00.000Z");
  });

  it("summer day starts at 21:00 UTC the day before (UTC+3)", () => {
    expect(startOfBusinessDay("2026-07-01").toISOString()).toBe("2026-06-30T21:00:00.000Z");
  });

  it("spring-forward day (2026-03-27) lasts 23 hours", () => {
    const { start, end } = businessDayRange("2026-03-27");
    expect(start.toISOString()).toBe("2026-03-26T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-27T21:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(23 * HOUR);
  });

  it("fall-back day (2026-10-25) lasts 25 hours", () => {
    const { start, end } = businessDayRange("2026-10-25");
    expect(start.toISOString()).toBe("2026-10-24T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-25T22:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(25 * HOUR);
  });

  it("maps instants to the business date across midnight", () => {
    expect(businessDate(new Date("2026-01-14T21:59:59Z"))).toBe("2026-01-14");
    expect(businessDate(new Date("2026-01-14T22:00:00Z"))).toBe("2026-01-15");
    expect(businessDate(new Date("2026-07-31T21:30:00Z"))).toBe("2026-08-01");
  });

  it("round-trips start → businessDate for every day of 2026", () => {
    let d = "2026-01-01";
    for (let i = 0; i < 365; i++) {
      expect(businessDate(startOfBusinessDay(d))).toBe(d);
      expect(businessDate(new Date(endOfBusinessDay(d).getTime() - 1))).toBe(d);
      d = addBusinessDays(d, 1);
    }
    expect(d).toBe("2027-01-01");
  });

  it("rejects malformed dates", () => {
    expect(() => startOfBusinessDay("2026-02-30")).toThrow(RangeError);
    expect(() => startOfBusinessDay("26-1-1")).toThrow(RangeError);
  });
});

describe("businessMonthRange", () => {
  it("covers March 2026 including the DST switch", () => {
    const { start, end } = businessMonthRange(2026, 3);
    expect(start.toISOString()).toBe("2026-02-28T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-31T21:00:00.000Z");
  });

  it("wraps December into the next year", () => {
    const { start, end } = businessMonthRange(2026, 12);
    expect(start.toISOString()).toBe("2026-11-30T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T22:00:00.000Z");
  });

  it("rejects month 13", () => {
    expect(() => businessMonthRange(2026, 13)).toThrow(RangeError);
  });
});
