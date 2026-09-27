import ar from "../../../../messages/ar/auth.json";
import en from "../../../../messages/en/auth.json";
import type { Locale } from "../guards";

/**
 * i18n SHIM (lane decision 6): reads `messages/<locale>/auth.json` until W3's next-intl wiring lands.
 * SHIM(platform-merge): replace `authT(locale)` with `await getTranslations("auth")` — same dotted keys and `{var}`
 * placeholders, so call sites only change the import.
 */

export type AuthMessages = typeof en;
const CATALOG: Record<Locale, AuthMessages> = { ar, en };

export type AuthT = (key: string, values?: Record<string, string | number>) => string;

function lookup(tree: unknown, key: string): string | undefined {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

export function authT(locale: Locale): AuthT {
  const tree = CATALOG[locale] ?? CATALOG.ar;
  return (key, values) => {
    const raw = lookup(tree, key) ?? lookup(CATALOG.en, key) ?? key;
    return values ? raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in values ? String(values[name]) : m)) : raw;
  };
}

/** The whole namespace for a locale (passed to client components as plain data). */
export function authMessages(locale: Locale): AuthMessages {
  return CATALOG[locale] ?? CATALOG.ar;
}
