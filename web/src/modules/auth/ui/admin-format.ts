import type { Locale } from "../guards";

/** Business-time display for the back office: Asia/Jerusalem, Latin digits in both locales. */
export function formatDateTime(locale: Locale, d: Date | null | undefined): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(d);
}

const BADGE: Record<string, string> = {
  active: "border-success bg-success-soft",
  suspended: "border-line-strong bg-surface",
  revoked: "border-danger bg-danger-soft",
};

export const statusBadgeCls = (status: string) =>
  `inline-block rounded-control border px-2 py-0.5 text-sm font-medium text-ink ${BADGE[status] ?? BADGE.suspended}`;

/** Localised role name; unknown (future) role keys fall back to the key itself. */
export function roleLabel(t: { (k: string): string; has(k: string): boolean }, key: string): string {
  return t.has(`staff.users.role.${key}`) ? t(`staff.users.role.${key}`) : key;
}
