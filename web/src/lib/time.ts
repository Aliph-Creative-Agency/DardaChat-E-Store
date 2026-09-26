/**
 * Time rules (CON-10): every timestamp is stored and compared in UTC; business boundaries (a "day", a "month" in
 * reports, cut-offs) are computed in Asia/Jerusalem and returned as UTC instants. Business dates are plain
 * `YYYY-MM-DD` strings so they never carry an accidental offset.
 */
import { TZDate } from "@date-fns/tz";

export const BUSINESS_TZ = "Asia/Jerusalem";

/** `YYYY-MM-DD` */
export type BusinessDate = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function parseBusinessDate(date: BusinessDate): { y: number; m: number; d: number } {
  const match = DATE_RE.exec(date);
  if (!match) throw new RangeError(`not a YYYY-MM-DD business date: ${date}`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    throw new RangeError(`invalid calendar date: ${date}`);
  }
  return { y, m, d };
}

/** Local midnight in the business zone for a calendar day, as a UTC instant. */
function zonedMidnight(y: number, m: number, d: number): Date {
  return new Date(new TZDate(y, m - 1, d, 0, 0, 0, 0, BUSINESS_TZ).getTime());
}

/** The business (Asia/Jerusalem) calendar date an instant falls on. */
export function businessDate(instant: Date): BusinessDate {
  const z = new TZDate(instant.getTime(), BUSINESS_TZ);
  return `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`;
}

/** First instant of the business day (inclusive), in UTC. */
export function startOfBusinessDay(date: BusinessDate): Date {
  const { y, m, d } = parseBusinessDate(date);
  return zonedMidnight(y, m, d);
}

/** End of the business day as an EXCLUSIVE bound (= start of the next business day), in UTC. Use `< end`. */
export function endOfBusinessDay(date: BusinessDate): Date {
  const { y, m, d } = parseBusinessDate(date);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return zonedMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** `[start, end)` of a business day in UTC. */
export function businessDayRange(date: BusinessDate): { start: Date; end: Date } {
  return { start: startOfBusinessDay(date), end: endOfBusinessDay(date) };
}

/** `[start, end)` of a business month (month is 1–12) in UTC. */
export function businessMonthRange(year: number, month: number): { start: Date; end: Date } {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`invalid month: ${month}`);
  const start = zonedMidnight(year, month, 1);
  const end = month === 12 ? zonedMidnight(year + 1, 1, 1) : zonedMidnight(year, month + 1, 1);
  return { start, end };
}

/** Add whole calendar days to a business date. */
export function addBusinessDays(date: BusinessDate, days: number): BusinessDate {
  const { y, m, d } = parseBusinessDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
