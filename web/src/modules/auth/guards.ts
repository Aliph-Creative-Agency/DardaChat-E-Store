import { and, eq } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { customers } from "../engagement/schema";
import { COOKIE_NAMES } from "./config";
import { isKnownPermission, type Permission } from "./permissions";
import { clientIp } from "./rate-limit";
import { permissions, rolePermissions, roles, staffUsers, userRoles } from "./schema";
import { type Session, validateSession } from "./session";

/**
 * Guard logic (FR-ACC-009/010/012, NFR-SEC-003), free of `next/*` so vitest can drive it. Route handlers read
 * cookies from the Request; pages and server actions go through `next.ts` (cookies()/headers()).
 */

export type Locale = "ar" | "en";

export interface CurrentCustomer {
  id: string;
  email: string | null;
  phoneE164: string | null;
  name: string | null;
  locale: Locale;
  sessionId: string;
}

export interface CurrentStaff {
  id: string;
  email: string;
  name: string;
  locale: Locale;
  roles: string[];
  mustChangePassword: boolean;
  sessionId: string;
  /** false until TOTP is completed for this session (FR-ACC-012). */
  secondFactorDone: boolean;
}

export interface StaffContext {
  staff: CurrentStaff;
  session: Session;
}

export async function resolveCustomer(db: DbOrTx, token: string | null | undefined, now = new Date()) {
  const session = await validateSession(db, token, "customer", now);
  if (!session) return null;
  const [c] = await db
    .select({ id: customers.id, email: customers.email, phoneE164: customers.phoneE164, name: customers.name, locale: customers.locale })
    .from(customers)
    .where(eq(customers.id, session.subjectId));
  if (!c) return null;
  return { customer: { ...c, sessionId: session.id } as CurrentCustomer, session };
}

/** Staff session incl. one still waiting for its second factor. Use `staff.secondFactorDone` to tell them apart. */
export async function resolveStaff(db: DbOrTx, token: string | null | undefined, now = new Date()): Promise<StaffContext | null> {
  const session = await validateSession(db, token, "staff", now);
  if (!session) return null;
  const [u] = await db.select().from(staffUsers).where(eq(staffUsers.id, session.subjectId));
  if (!u) return null;
  const roleRows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, u.id));
  return {
    session,
    staff: {
      id: u.id,
      email: u.email,
      name: u.name,
      locale: u.locale,
      roles: roleRows.map((r) => r.key),
      mustChangePassword: u.mustChangePassword,
      sessionId: session.id,
      secondFactorDone: session.secondFactorAt != null,
    },
  };
}

/** Deny by default: unknown key → false for everyone; otherwise an explicit DB grant through one of the user's roles. */
export async function can(db: DbOrTx, staffId: string, permission: string): Promise<boolean> {
  if (!isKnownPermission(permission)) return false;
  const rows = await db
    .select({ id: rolePermissions.id })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(userRoles.userId, staffId), eq(permissions.key, permission)))
    .limit(1);
  return rows.length > 0;
}

export type StaffDecision =
  | { ok: true; ctx: StaffContext }
  | { ok: false; reason: StaffDenyReason; ctx?: StaffContext };

/**
 * Why a staff request was refused, in the order they are checked. `password_change_required`: 2FA is done but the
 * account still carries an Owner-issued temporary password (FR-ACC-013/015, NFR-SEC-003) — only the change-password
 * page/API, 2FA pages and sign-out work until it is changed.
 */
export type StaffDenyReason = "unauthenticated" | "two_factor_required" | "password_change_required" | "forbidden";

export async function decideStaff(
  db: DbOrTx,
  token: string | null | undefined,
  permission: Permission | string,
  now = new Date(),
): Promise<StaffDecision> {
  const ctx = await resolveStaff(db, token, now);
  if (!ctx) return { ok: false, reason: "unauthenticated" };
  if (!ctx.staff.secondFactorDone) return { ok: false, reason: "two_factor_required", ctx };
  if (ctx.staff.mustChangePassword) return { ok: false, reason: "password_change_required", ctx };
  if (!(await can(db, ctx.staff.id, permission))) return { ok: false, reason: "forbidden", ctx };
  return { ok: true, ctx };
}

/** UI-003: remember the chosen language on the account. */
export async function setSubjectLocale(db: DbOrTx, subject: { type: "customer" | "staff"; id: string }, locale: Locale) {
  if (subject.type === "staff") await db.update(staffUsers).set({ locale }).where(eq(staffUsers.id, subject.id));
  else await db.update(customers).set({ locale }).where(eq(customers.id, subject.id));
}

/** Read one cookie from a Request's `cookie` header (route handlers; no next/headers needed). */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export const STAFF_ROUTE = Symbol.for("dardachat.auth.staffRoute");
export const STAFF_ACTION = Symbol.for("dardachat.auth.staffAction");

export interface RouteMeta {
  permission: string;
}

export interface StaffRouteContext<P> {
  staff: CurrentStaff;
  session: Session;
  params: P;
  ip: string;
}

type RouteCtx<P> = { params: Promise<P> };

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });

/** HTTP status per deny reason: 401 = sign in again, 403 = signed in but not allowed (yet). */
export const STAFF_DENY_STATUS: Record<StaffDenyReason, 401 | 403> = {
  unauthenticated: 401,
  two_factor_required: 401,
  password_change_required: 403,
  forbidden: 403,
};

/**
 * Wrap an admin route handler: 401 without a fully authenticated (2FA) staff session, 403 while a temporary password
 * is still unchanged (`password_change_required`) or without the permission (`forbidden`).
 * `getDb` is resolved per request so tests can inject the test DB.
 */
export function makeStaffRoute(getDb: () => DbOrTx) {
  return function staffRoute<P = Record<string, string>>(
    permission: Permission,
    handler: (req: Request, ctx: StaffRouteContext<P>) => Promise<Response> | Response,
  ) {
    const wrapped = async (req: Request, routeCtx?: RouteCtx<P>): Promise<Response> => {
      const d = await decideStaff(getDb(), readCookie(req, COOKIE_NAMES.staff), permission);
      if (!d.ok) return json(STAFF_DENY_STATUS[d.reason], d.reason);
      const params = (routeCtx?.params ? await routeCtx.params : {}) as P;
      return handler(req, { ...d.ctx, params, ip: clientIp(req.headers) });
    };
    return Object.assign(wrapped, { [STAFF_ROUTE]: { permission } satisfies RouteMeta });
  };
}

export interface CustomerRouteContext<P> {
  customer: CurrentCustomer;
  session: Session;
  params: P;
  ip: string;
}

export function makeCustomerRoute(getDb: () => DbOrTx) {
  return function customerRoute<P = Record<string, string>>(
    handler: (req: Request, ctx: CustomerRouteContext<P>) => Promise<Response> | Response,
  ) {
    return async (req: Request, routeCtx?: RouteCtx<P>): Promise<Response> => {
      const r = await resolveCustomer(getDb(), readCookie(req, COOKIE_NAMES.customer));
      if (!r) return json(401, "unauthenticated");
      const params = (routeCtx?.params ? await routeCtx.params : {}) as P;
      return handler(req, { ...r, params, ip: clientIp(req.headers) });
    };
  };
}

export function getRouteMeta(fn: unknown): RouteMeta | undefined {
  return typeof fn === "function" ? (fn as unknown as Record<symbol, RouteMeta>)[STAFF_ROUTE] : undefined;
}
