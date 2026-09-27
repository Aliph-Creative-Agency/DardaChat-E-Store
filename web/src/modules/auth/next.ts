import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../../db/client";
import { COOKIE_NAMES } from "./config";
import {
  type CurrentCustomer,
  type CurrentStaff,
  decideStaff,
  type Locale,
  makeCustomerRoute,
  makeStaffRoute,
  resolveCustomer,
  resolveStaff,
  STAFF_ACTION,
  type StaffContext,
  type StaffDenyReason,
} from "./guards";
import type { Permission } from "./permissions";
import { clientIp } from "./rate-limit";
import { type SessionMeta, type SubjectType, sessionCookie } from "./session";

/** Thin Next.js adapter over guards.ts: cookies()/headers()/redirect() live only here. */

export async function requestMeta(): Promise<SessionMeta & { ip: string }> {
  const h = await headers();
  return { ip: clientIp(h), userAgent: h.get("user-agent") };
}

export async function getCurrentCustomer(): Promise<CurrentCustomer | null> {
  const jar = await cookies();
  return (await resolveCustomer(db, jar.get(COOKIE_NAMES.customer)?.value))?.customer ?? null;
}

/** The signed-in back-office user, or null — including when 2FA is still pending for the session. */
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const ctx = await getStaffContext();
  return ctx?.staff.secondFactorDone ? ctx.staff : null;
}

/** Staff session even before 2FA (for the two-factor pages only). */
export async function getStaffContext(): Promise<StaffContext | null> {
  const jar = await cookies();
  return resolveStaff(db, jar.get(COOKIE_NAMES.staff)?.value);
}

/** Only same-origin absolute paths are accepted as a post-sign-in destination (no open redirect). */
export function safeNext(next?: string | null): string | undefined {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : undefined;
}
const withNext = (path: string, next?: string) => {
  const n = safeNext(next);
  return n ? `${path}?next=${encodeURIComponent(n)}` : path;
};

export async function requireCustomer(opts: { locale?: Locale; next?: string } = {}): Promise<CurrentCustomer> {
  const c = await getCurrentCustomer();
  if (!c) redirect(withNext(`/${opts.locale ?? "ar"}/sign-in`, opts.next));
  return c;
}

/**
 * Page guard for the back office. No session → staff sign-in; 2FA pending → two-factor page; temporary password not
 * yet changed → change-password page (server-side, NFR-SEC-003); missing permission →
 * the 403 page (`/{locale}/staff/forbidden`; Next's forbidden() needs a next.config flag this lane does not own).
 */
export async function requireStaff(permission: Permission, opts: { locale?: Locale; next?: string } = {}): Promise<CurrentStaff> {
  const locale = opts.locale ?? "ar";
  const jar = await cookies();
  const d = await decideStaff(db, jar.get(COOKIE_NAMES.staff)?.value, permission);
  if (d.ok) return d.ctx.staff;
  if (d.reason === "unauthenticated") redirect(withNext(`/${locale}/staff/sign-in`, opts.next));
  if (d.reason === "two_factor_required") redirect(withNext(`/${locale}/staff/two-factor`, opts.next));
  if (d.reason === "password_change_required") redirect(withNext(`/${locale}/staff/change-password`, opts.next));
  redirect(`/${locale}/staff/forbidden`);
}

/** Route-handler wrappers (read the cookie from the Request). */
export const staffRoute = makeStaffRoute(() => db);
export const customerRoute = makeCustomerRoute(() => db);

export class AuthError extends Error {
  constructor(readonly reason: StaffDenyReason) {
    super(reason);
  }
}

/** Server-action wrapper: throws AuthError unless a 2FA-complete staff session holds `permission`. */
export function staffAction<A extends unknown[], R>(
  permission: Permission,
  fn: (ctx: StaffContext, ...args: A) => Promise<R>,
) {
  const wrapped = async (...args: A): Promise<R> => {
    const jar = await cookies();
    const d = await decideStaff(db, jar.get(COOKIE_NAMES.staff)?.value, permission);
    if (!d.ok) throw new AuthError(d.reason);
    return fn(d.ctx, ...args);
  };
  return Object.assign(wrapped, { [STAFF_ACTION]: { permission } });
}

export async function setSessionCookie(subjectType: SubjectType, token: string): Promise<void> {
  const { name, ...opts } = sessionCookie(subjectType);
  (await cookies()).set(name, token, opts);
}

export async function clearSessionCookie(subjectType: SubjectType): Promise<void> {
  const { name, ...opts } = sessionCookie(subjectType);
  (await cookies()).set(name, "", { ...opts, maxAge: 0 });
}

export async function readSessionToken(subjectType: SubjectType): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAMES[subjectType])?.value;
}
