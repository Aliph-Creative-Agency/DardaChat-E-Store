import { safeNext } from "../next";

/** Shared helpers for the /[locale]/staff/** pages. After 2FA the default landing is the admin dashboard
 * (`dashboard.view`, granted to every role; the Users page is Owner-only, so Staff would land on /staff/forbidden). */
export function staffNext(locale: string, sp: Record<string, string | string[] | undefined>): string {
  return safeNext(typeof sp.next === "string" ? sp.next : undefined) ?? `/${locale}/admin`;
}

export const withNextParam = (path: string, next: string) => `${path}?next=${encodeURIComponent(next)}`;
