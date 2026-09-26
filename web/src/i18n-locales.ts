// Minimal locale list for the Phase 0 scaffold. W3 (shell) replaces this with next-intl routing config.
export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function localeDir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
