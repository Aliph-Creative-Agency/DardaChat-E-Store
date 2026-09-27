"use server";

import { getShellSubject } from "@/lib/shell/viewer";
import { persistLocalePreference } from "./locale-preference";
import { isLocale } from "./routing";

/**
 * Called by the LocaleSwitcher when a visitor picks a language. The `NEXT_LOCALE` cookie is set client-side by
 * next-intl's `Link locale=` (setting it here too would make Next refresh the current route before navigating);
 * this action adds the signed-in part of UI-003: save the choice on the staff/customer row so it follows the user
 * to other devices. Anonymous visitors: no-op. Never throws to the caller (a failed save must not block navigation).
 */
export async function rememberLocale(locale: string): Promise<{ saved: boolean }> {
  if (!isLocale(locale)) return { saved: false };
  const subject = await getShellSubject();
  if (!subject) return { saved: false };
  try {
    return { saved: await persistLocalePreference(subject, locale) };
  } catch {
    return { saved: false };
  }
}
