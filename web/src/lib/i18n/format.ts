/**
 * Locale-aware formatting (UI-002, NFR-LOC-004). One place so every screen shows numbers, dates and money the same way.
 *
 * Decisions (platform/shell SHL-04):
 * - Latin digits in both locales (`-u-nu-latn`), matching `src/lib/money.ts`, so prices, phone numbers and order refs
 *   read identically in ar and en.
 * - Arabic uses `ar-PS`: Levantine month names ("أيلول", not "سبتمبر"), which is what Palestinian customers read.
 * - English uses `en-GB`: day-month-year order and a 24-hour clock, as used locally.
 * - Every date/time is rendered in the business timezone Asia/Jerusalem (CON-10), whatever the server's TZ.
 */
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { formatMoney as formatMoneyCore, type Agorot } from "@/lib/money";
import { BUSINESS_TZ } from "@/lib/time";
import { ltr } from "./bidi";
import type { Locale } from "./routing";

export const INTL_LOCALE: Record<Locale, string> = {
  ar: "ar-PS-u-nu-latn",
  en: "en-GB-u-nu-latn",
};

export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new RangeError(`invalid date: ${String(value)}`);
  return d;
}

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, make: () => T): T {
  let f = cache.get(key) as T | undefined;
  if (!f) cache.set(key, (f = make()));
  return f;
}

export function formatNumber(value: number, locale: Locale, options: Intl.NumberFormatOptions = {}): string {
  const key = `n|${locale}|${JSON.stringify(options)}`;
  return cached(key, () => new Intl.NumberFormat(INTL_LOCALE[locale], options)).format(value);
}

/** `ratio` is a fraction: 0.16 → "16%". */
export function formatPercent(ratio: number, locale: Locale, maximumFractionDigits = 1): string {
  return formatNumber(ratio, locale, { style: "percent", maximumFractionDigits });
}

export const DATE_STYLES = {
  /** 27/09/2026 */
  short: { day: "2-digit", month: "2-digit", year: "numeric" },
  /** 27 Sept 2026 · 27 أيلول 2026 */
  medium: { day: "numeric", month: "short", year: "numeric" },
  /** Sunday, 27 September 2026 · الأحد، 27 أيلول 2026 (exact punctuation depends on the ICU version) */
  long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof DATE_STYLES;

const TIME_OPTIONS = { hour: "2-digit", minute: "2-digit" } as const satisfies Intl.DateTimeFormatOptions;

function dateTimeFormat(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `d|${locale}|${JSON.stringify(options)}`;
  return cached(key, () => new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...options, timeZone: BUSINESS_TZ }));
}

export function formatDate(value: DateInput, locale: Locale, style: DateStyle = "medium"): string {
  return dateTimeFormat(locale, DATE_STYLES[style]).format(toDate(value));
}

export function formatTime(value: DateInput, locale: Locale): string {
  return dateTimeFormat(locale, TIME_OPTIONS).format(toDate(value));
}

export function formatDateTime(value: DateInput, locale: Locale, style: DateStyle = "medium"): string {
  return dateTimeFormat(locale, { ...DATE_STYLES[style], ...TIME_OPTIONS }).format(toDate(value));
}

/** Money is integer agorot; delegates to `src/lib/money.ts` so there is exactly one ILS formatter. */
export function formatMoney(amount: Agorot, locale: Locale): string {
  return formatMoneyCore(amount, locale);
}

/**
 * Phone for display: international format ("+970 59 912 3456"), wrapped in an LTR isolate so the leading "+" stays on
 * the left inside Arabic text. Unparseable input is returned isolated but unchanged.
 */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return ltr(parsed ? parsed.formatInternational() : e164);
}

/** next-intl `formats` aligned with the helpers above (used by `useFormatter()` / ICU `{d, date, medium}`). */
export const INTL_FORMATS = {
  dateTime: {
    short: { ...DATE_STYLES.short, numberingSystem: "latn" },
    medium: { ...DATE_STYLES.medium, numberingSystem: "latn" },
    long: { ...DATE_STYLES.long, numberingSystem: "latn" },
    time: { ...TIME_OPTIONS, numberingSystem: "latn" },
  },
  number: {
    integer: { maximumFractionDigits: 0, numberingSystem: "latn" },
    decimal: { maximumFractionDigits: 2, numberingSystem: "latn" },
    percent: { style: "percent", maximumFractionDigits: 1, numberingSystem: "latn" },
  },
} as const;
