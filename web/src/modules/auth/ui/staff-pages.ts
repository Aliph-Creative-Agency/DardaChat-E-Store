import { safeNext } from "../next";

/** Shared helpers for the /[locale]/staff/** pages. After 2FA the default landing is the admin Users page. */
export function staffNext(locale: string, sp: Record<string, string | string[] | undefined>): string {
  return safeNext(typeof sp.next === "string" ? sp.next : undefined) ?? `/${locale}/admin/users`;
}

export const withNextParam = (path: string, next: string) => `${path}?next=${encodeURIComponent(next)}`;
