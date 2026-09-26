import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n-locales";

export { DEFAULT_LOCALE, LOCALES, isLocale, localeDir, type Locale } from "@/i18n-locales";

/** Name of the cookie that remembers the visitor's last chosen locale (UI-003). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * UI-001: Arabic by default, English on request, locale always in the URL (`/ar/...`, `/en/...`).
 * `/` resolves to the `NEXT_LOCALE` cookie, else Arabic. Accept-Language is deliberately ignored — the proxy strips it
 * before next-intl sees the request (see `src/proxy.ts`).
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
});
