/**
 * Human-facing reference codes and opaque tokens.
 * Order references (FR-ORD-024) are random (non-sequential, so they leak no volume) and easy to read aloud over the
 * phone or WhatsApp: `DC-` + 8 Crockford base32 characters in two groups, e.g. `DC-7KQ4-M2XP`.
 * Crockford's alphabet has no I, L, O or U; `normalizeOrderReference` maps the look-alikes typed by people back.
 */

export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ORDER_REF_RE = /^DC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

/** n random Crockford base32 characters (5 bits each, no modulo bias). */
export function randomCrockford(n: number): string {
  const bytes = randomBytes(n);
  let s = "";
  for (const b of bytes) s += CROCKFORD_ALPHABET[b & 31];
  return s;
}

/** A new random order reference, e.g. `DC-7KQ4-M2XP` (40 bits of entropy). Uniqueness is enforced by the DB. */
export function newOrderReference(): string {
  const body = randomCrockford(8);
  return `DC-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function isOrderReference(value: string): boolean {
  return ORDER_REF_RE.test(value);
}

/**
 * Tolerant parse of a reference typed or dictated by a person: case-insensitive, spaces/dashes optional, the `DC`
 * prefix optional, O→0 and I/L→1. Returns the canonical form or null.
 */
export function normalizeOrderReference(input: string): string | null {
  let s = input.toUpperCase().replace(/[\s\-_]/g, "");
  if (s.startsWith("DC")) s = s.slice(2);
  s = s.replace(/O/g, "0").replace(/[IL]/g, "1");
  if (s.length !== 8) return null;
  for (const ch of s) if (!CROCKFORD_ALPHABET.includes(ch)) return null;
  return `DC-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Opaque URL-safe secret (session tokens, reset links, cart tokens). Store only a hash of it. */
export function newToken(bytes = 32): string {
  if (!Number.isInteger(bytes) || bytes < 16) throw new RangeError("tokens need at least 16 bytes");
  return Buffer.from(randomBytes(bytes)).toString("base64url");
}
