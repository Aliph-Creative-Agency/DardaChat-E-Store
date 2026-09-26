/**
 * Money: ILS only (CON-01, FR-CUR-001..004). Every amount is an integer count of agorot (1 ILS = 100 agorot).
 * No floats ever carry money; formatting divides by 100 only at the display edge.
 * Decision (PLA-06): Arabic UI shows Latin digits (`ar-u-nu-latn`) so prices, phone numbers and order references
 * read the same in both locales; the ₪ sign follows each locale's placement rules.
 */

declare const agorotBrand: unique symbol;
/** Integer agorot. Construct with `agorot()`; arithmetic helpers below keep the brand. */
export type Agorot = number & { readonly [agorotBrand]: true };

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Guard: value must be a safe integer (may be negative, e.g. adjustments). */
export function agorot(value: number): Agorot {
  if (!Number.isSafeInteger(value)) throw new MoneyError(`not an integer agorot amount: ${value}`);
  return (value === 0 ? 0 : value) as Agorot; // normalise -0
}

export function nonNegativeAgorot(value: number): Agorot {
  const a = agorot(value);
  if (a < 0) throw new MoneyError(`amount must not be negative: ${value}`);
  return a;
}

export const ZERO = 0 as Agorot;

export function add(a: Agorot, b: Agorot): Agorot {
  return agorot(a + b);
}

export function subtract(a: Agorot, b: Agorot): Agorot {
  return agorot(a - b);
}

export function sum(values: readonly Agorot[]): Agorot {
  let total = 0;
  for (const v of values) total = agorot(total + v);
  return total as Agorot;
}

/** Unit price × integer quantity. */
export function multiply(a: Agorot, qty: number): Agorot {
  if (!Number.isSafeInteger(qty)) throw new MoneyError(`quantity must be an integer: ${qty}`);
  return agorot(a * qty);
}

export type MoneyLocale = "ar" | "en";

const formatters: Record<MoneyLocale, Intl.NumberFormat> = {
  ar: new Intl.NumberFormat("ar-u-nu-latn", { style: "currency", currency: "ILS" }),
  en: new Intl.NumberFormat("en-US", { style: "currency", currency: "ILS" }),
};

/** `formatMoney(123450, "en")` → "₪1,234.50"; ar → "‏1,234.50 ₪" (RLM-prefixed, Latin digits). */
export function formatMoney(amount: Agorot, locale: MoneyLocale): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  // Build the decimal string from integer parts so no float rounding can shift an agora.
  const value = Number(`${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`);
  return formatters[locale].format(negative ? -value : value);
}

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DECIMAL_SEPARATOR = "٫";
const ARABIC_THOUSANDS_SEPARATOR = "٬";

function normaliseDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const a = ARABIC_INDIC.indexOf(ch);
    const e = EXTENDED_ARABIC_INDIC.indexOf(ch);
    if (a >= 0) out += String(a);
    else if (e >= 0) out += String(e);
    else if (ch === ARABIC_DECIMAL_SEPARATOR) out += ".";
    else if (ch === ARABIC_THOUSANDS_SEPARATOR) out += ",";
    else out += ch;
  }
  return out;
}

/**
 * Parse an admin-typed ILS amount ("12", "12.5", "1,234.50", "₪ 12.50", Arabic-Indic digits) into agorot.
 * Returns null for empty/invalid input, more than 2 decimals, or negatives (unless allowNegative).
 */
export function parseMoneyInput(input: string, opts: { allowNegative?: boolean } = {}): Agorot | null {
  const s = normaliseDigits(input)
    .replace(/[₪\s‏‎ ]/g, "")
    .replace(/ILS/gi, "");
  const m = /^(-)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const [, minus, intPart = "", frac = ""] = m;
  if (minus && !opts.allowNegative) return null;
  const whole = Number(intPart.replace(/,/g, ""));
  const cents = Number(frac.padEnd(2, "0"));
  const value = whole * 100 + cents;
  if (!Number.isSafeInteger(value)) return null;
  return agorot(minus ? -value : value);
}
