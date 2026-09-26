import {
  type CountryCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
} from "libphonenumber-js/max";

/**
 * Phone numbers (CON-05, FR-ADR-004). Everything is stored as E.164 (`phone_e_164` columns); input may be in any
 * international or local format, including Arabic-Indic / Persian digits. Display is always Latin digits; callers
 * wrap the result in a bidi isolate (`<bdi dir="ltr">`) when it sits inside Arabic text.
 */

export type PhoneResult =
  | { ok: true; e164: string; region: string | undefined }
  | { ok: false; reason: "empty" | "invalid" | "too_short" | "too_long" };

export const DEFAULT_PHONE_REGION = "PS";

/** Arabic-Indic (U+0660..0669) and Extended Arabic-Indic / Persian (U+06F0..06F9) digits → ASCII. */
export function toLatinDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });
}

function clean(input: string): string {
  let s = toLatinDigits(input)
    .normalize("NFKC")
    .replace(/[‎‏‪-‮⁦-⁩]/g, "") // bidi marks
    .trim();
  // keep one leading "+", digits and common separators; "00" international prefix → "+"
  s = s.replace(/[\s\-().‐-―/]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  return s;
}

export function normalizePhone(input: string | null | undefined, defaultRegion: string = DEFAULT_PHONE_REGION): PhoneResult {
  if (input == null) return { ok: false, reason: "empty" };
  const s = clean(input);
  if (s === "" || s === "+") return { ok: false, reason: "empty" };
  if (!/^\+?\d+$/.test(s)) return { ok: false, reason: "invalid" };
  const region = defaultRegion as CountryCode;
  const length = validatePhoneNumberLength(s, region);
  if (length === "TOO_SHORT" || length === "NOT_A_NUMBER") return { ok: false, reason: "too_short" };
  if (length === "TOO_LONG") return { ok: false, reason: "too_long" };
  const parsed = parsePhoneNumberFromString(s, region);
  if (!parsed || !parsed.isValid()) return { ok: false, reason: "invalid" };
  return { ok: true, e164: parsed.number, region: parsed.country };
}

/** Display form: national format for Palestinian numbers (`059-123-4567` style), international for foreign ones. */
export function formatPhoneForDisplay(e164: string, homeRegion: string = DEFAULT_PHONE_REGION): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  if (parsed.country === homeRegion) {
    const digits = parsed.formatNational().replace(/\D/g, "");
    // 10-digit PS mobile: 059-123-4567; otherwise fall back to libphonenumber's national grouping
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return parsed.formatNational();
  }
  return parsed.formatInternational();
}

/** Masked form for UIs and logs: `+970 59•••4567`. */
export function maskPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  const national = parsed ? String(parsed.nationalNumber) : e164.replace(/\D/g, "");
  const cc = parsed ? `+${parsed.countryCallingCode}` : "";
  if (national.length <= 6) return `${cc} ${"•".repeat(national.length)}`.trim();
  return `${cc} ${national.slice(0, 2)}${"•".repeat(national.length - 6)}${national.slice(-4)}`.trim();
}
