/**
 * Bidirectional-text helpers (NFR-LOC-004/005). Wrap any value of unknown or opposite direction (order refs, SKUs,
 * phone numbers, emails, product names in the other language) before interpolating it into a sentence, so its
 * neutral characters (`-`, `(`, `.`) cannot re-order the surrounding text. In JSX prefer `<Bdi>`.
 */

/** First Strong Isolate: direction taken from the value's first strong character. */
export const FSI = "⁨";
/** Left-to-Right Isolate. */
export const LRI = "⁦";
/** Right-to-Left Isolate. */
export const RLI = "⁧";
/** Pop Directional Isolate (closes FSI/LRI/RLI). */
export const PDI = "⁩";

const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/g;

/** Isolate with auto direction (FSI … PDI). */
export function isolate(value: string | number): string {
  return `${FSI}${value}${PDI}`;
}

/** Force left-to-right (LRI … PDI): references, codes, phone numbers, emails, URLs. */
export function ltr(value: string | number): string {
  return `${LRI}${value}${PDI}`;
}

/** Force right-to-left (RLI … PDI). */
export function rtl(value: string | number): string {
  return `${RLI}${value}${PDI}`;
}

/** Remove bidi marks and isolates (for comparisons, search, copy-to-clipboard). */
export function stripBidi(value: string): string {
  return value.replace(BIDI_CONTROLS, "");
}

/** Isolate every string value in a next-intl values object: `t("orderPlaced", isolateValues({ ref }))`. */
export function isolateValues<T extends Record<string, unknown>>(values: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) out[k] = typeof v === "string" ? isolate(v) : v;
  return out as T;
}
