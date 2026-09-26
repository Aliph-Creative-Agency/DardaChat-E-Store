import { and, asc, eq, ne, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import type { DbOrTx, Tx } from "../../db/connection";
import { auditedMutation } from "./audit";
import { hashPassword } from "./crypto";
import { normaliseEmail } from "./customer-auth";
import { checkPasswordWithSettings, type PasswordProblem } from "./password-policy";
import { roles, staffUsers, totpSecrets, userRoles } from "./schema";
import { revokeAllSessions } from "./session";

/** Back-office user management (FR-ACC-011, FR-ACC-013..015). Every mutation is audited with before/after. */

export interface StaffUserRow {
  id: string;
  email: string;
  name: string;
  status: "active" | "suspended" | "revoked";
  roles: string[];
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export async function listStaffUsers(db: DbOrTx): Promise<StaffUserRow[]> {
  const users = await db
    .select({
      id: staffUsers.id,
      email: staffUsers.email,
      name: staffUsers.name,
      status: staffUsers.status,
      mustChangePassword: staffUsers.mustChangePassword,
      lastLoginAt: staffUsers.lastLoginAt,
      createdAt: staffUsers.createdAt,
      totpConfirmedAt: totpSecrets.confirmedAt,
    })
    .from(staffUsers)
    .leftJoin(totpSecrets, eq(totpSecrets.userId, staffUsers.id))
    .orderBy(asc(staffUsers.createdAt), asc(staffUsers.email));
  const grants = await db
    .select({ userId: userRoles.userId, key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId));
  return users.map(({ totpConfirmedAt, ...u }) => ({
    ...u,
    roles: grants.filter((g) => g.userId === u.id).map((g) => g.key),
    twoFactorEnabled: totpConfirmedAt != null,
  }));
}

export async function getStaffUser(db: DbOrTx, id: string): Promise<StaffUserRow | null> {
  return (await listStaffUsers(db)).find((u) => u.id === id) ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// Mutations. Callers (admin routes/actions) check `users.manage`; these enforce the business guards:
// no action on yourself, never leave zero active owners, revoked is permanent.
// ---------------------------------------------------------------------------------------------------------------

export type StaffUserError =
  | { ok: false; error: "invalid_input"; fields: string[] }
  | { ok: false; error: "weak_password"; problems: PasswordProblem[] }
  | {
      ok: false;
      error: "email_taken" | "unknown_role" | "not_found" | "self_action" | "invalid_state" | "last_owner";
    };

type Actor = { id: string };
type Meta = { ip?: string | null };
const TARGET = "staff_user";

/** Readable one-time password for a new account: 4 × 4 unambiguous characters (≈ 80 bits). */
export function generateTempPassword(): string {
  const A = "abcdefghjkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 4 }, () => A[randomInt(0, A.length)]).join("");
  return [group(), group(), group(), group()].join("-");
}

async function roleId(db: DbOrTx, key: string): Promise<string | null> {
  const [r] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, key));
  return r?.id ?? null;
}

async function rolesOf(db: DbOrTx, userId: string): Promise<string[]> {
  const rows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.key).sort();
}

/** Active owners other than `exceptId`. Callers hold the owners lock. */
async function otherActiveOwners(tx: Tx, exceptId: string): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .innerJoin(staffUsers, eq(staffUsers.id, userRoles.userId))
    .where(and(eq(roles.key, "owner"), eq(staffUsers.status, "active"), ne(staffUsers.id, exceptId)));
  return row?.n ?? 0;
}

const OWNERS_LOCK = "auth:staff-owners";
const lockOwners = (tx: Tx) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${OWNERS_LOCK}))`);

export async function createStaffUser(
  db: DbOrTx,
  actor: Actor,
  input: { email: string; name: string; role: string; password?: string | null },
  meta: Meta = {},
): Promise<{ ok: true; id: string; tempPassword?: string } | StaffUserError> {
  const email = normaliseEmail(input.email);
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!email || !name) {
    return { ok: false, error: "invalid_input", fields: [...(email ? [] : ["email"]), ...(name ? [] : ["name"])] };
  }
  const rid = await roleId(db, input.role);
  if (!rid) return { ok: false, error: "unknown_role" };
  const tempPassword = input.password ? undefined : generateTempPassword();
  const password = input.password || tempPassword!;
  const problems = await checkPasswordWithSettings(db, password, { kind: "staff", identity: [email, name] });
  if (problems.length) return { ok: false, error: "weak_password", problems };
  const [dupe] = await db
    .select({ id: staffUsers.id })
    .from(staffUsers)
    .where(eq(sql`lower(${staffUsers.email})`, email));
  if (dupe) return { ok: false, error: "email_taken" };
  const passwordHash = await hashPassword(password);

  const id = await auditedMutation(
    db,
    { type: "staff", id: actor.id },
    { action: "staff.create", target: { type: TARGET }, ip: meta.ip },
    async (tx) => {
      const [u] = await tx
        .insert(staffUsers)
        .values({ email, name, passwordHash, mustChangePassword: true })
        .onConflictDoNothing()
        .returning({ id: staffUsers.id });
      if (!u) return { result: null };
      await tx.insert(userRoles).values({ userId: u.id, roleId: rid });
      return { result: u.id, after: { id: u.id, email, name, role: input.role, status: "active" } };
    },
  );
  if (!id) return { ok: false, error: "email_taken" };
  return tempPassword ? { ok: true, id, tempPassword } : { ok: true, id };
}

type Loaded = typeof staffUsers.$inferSelect & { roles: string[] };

class Refused extends Error {
  constructor(readonly failure: StaffUserError) {
    super(failure.error);
  }
}

/**
 * Shared frame for mutations on an existing user: self guard, owners lock, row lock, audit with before/after in the
 * same transaction. `fn` returns a refusal (rolled back, nothing audited) or the `after` snapshot.
 */
async function mutate(
  db: DbOrTx,
  actor: Actor,
  targetId: string,
  action: string,
  meta: Meta,
  fn: (tx: Tx, u: Loaded) => Promise<StaffUserError | { after: Record<string, unknown> }>,
): Promise<{ ok: true } | StaffUserError> {
  if (actor.id === targetId) return { ok: false, error: "self_action" };
  try {
    return await auditedMutation(
      db,
      { type: "staff", id: actor.id },
      { action, target: { type: TARGET, id: targetId }, ip: meta.ip },
      async (tx) => {
        await lockOwners(tx);
        const [u] = await tx.select().from(staffUsers).where(eq(staffUsers.id, targetId)).for("update");
        if (!u) throw new Refused({ ok: false, error: "not_found" });
        const loaded = { ...u, roles: await rolesOf(tx, u.id) };
        const r = await fn(tx, loaded);
        if ("ok" in r) throw new Refused(r);
        return { result: { ok: true } as const, before: { status: u.status, roles: loaded.roles }, after: r.after };
      },
    );
  } catch (e) {
    if (e instanceof Refused) return e.failure;
    throw e;
  }
}

const isOwner = (u: Loaded) => u.roles.includes("owner");

async function guardLastOwner(tx: Tx, u: Loaded): Promise<StaffUserError | null> {
  if (u.status === "active" && isOwner(u) && (await otherActiveOwners(tx, u.id)) === 0) {
    return { ok: false, error: "last_owner" };
  }
  return null;
}

/** Suspend: signs the user out everywhere at once (FR-ACC-013). */
export function suspendStaffUser(db: DbOrTx, actor: Actor, targetId: string, meta: Meta = {}) {
  return mutate(db, actor, targetId, "staff.suspend", meta, async (tx, u) => {
    if (u.status !== "active") return { ok: false, error: "invalid_state" };
    const g = await guardLastOwner(tx, u);
    if (g) return g;
    await tx.update(staffUsers).set({ status: "suspended" }).where(eq(staffUsers.id, u.id));
    await revokeAllSessions(tx, "staff", u.id);
    return { after: { status: "suspended", roles: u.roles } };
  });
}

/** Reinstate a suspended user. Revoked users can never come back (FR-ACC-014). */
export function reinstateStaffUser(db: DbOrTx, actor: Actor, targetId: string, meta: Meta = {}) {
  return mutate(db, actor, targetId, "staff.reinstate", meta, async (tx, u) => {
    if (u.status !== "suspended") return { ok: false, error: "invalid_state" };
    await tx.update(staffUsers).set({ status: "active" }).where(eq(staffUsers.id, u.id));
    return { after: { status: "active", roles: u.roles } };
  });
}

/** Permanent: sessions revoked immediately, TOTP secret deleted; the row and its audit history stay. */
export function revokeStaffUser(db: DbOrTx, actor: Actor, targetId: string, meta: Meta = {}) {
  return mutate(db, actor, targetId, "staff.revoke", meta, async (tx, u) => {
    if (u.status === "revoked") return { ok: false, error: "invalid_state" };
    const g = await guardLastOwner(tx, u);
    if (g) return g;
    await tx.update(staffUsers).set({ status: "revoked" }).where(eq(staffUsers.id, u.id));
    await revokeAllSessions(tx, "staff", u.id);
    await tx.delete(totpSecrets).where(eq(totpSecrets.userId, u.id));
    return { after: { status: "revoked", roles: u.roles } };
  });
}

/** Replace the user's role (one role per user). Takes effect on the next permission check. */
export function changeStaffRole(db: DbOrTx, actor: Actor, targetId: string, role: string, meta: Meta = {}) {
  return mutate(db, actor, targetId, "staff.role_change", meta, async (tx, u) => {
    if (u.status === "revoked") return { ok: false, error: "invalid_state" };
    const rid = await roleId(tx, role);
    if (!rid) return { ok: false, error: "unknown_role" };
    if (isOwner(u) && role !== "owner") {
      const g = await guardLastOwner(tx, u);
      if (g) return g;
    }
    await tx.delete(userRoles).where(eq(userRoles.userId, u.id));
    await tx.insert(userRoles).values({ userId: u.id, roleId: rid });
    return { after: { status: u.status, roles: [role] } };
  });
}

/** Lost phone: forget the authenticator and sign the user out; the next sign-in forces a fresh enrolment. */
export function resetStaffTwoFactor(db: DbOrTx, actor: Actor, targetId: string, meta: Meta = {}) {
  return mutate(db, actor, targetId, "staff.reset_2fa", meta, async (tx, u) => {
    if (u.status === "revoked") return { ok: false, error: "invalid_state" };
    await tx.delete(totpSecrets).where(eq(totpSecrets.userId, u.id));
    await revokeAllSessions(tx, "staff", u.id);
    return { after: { status: u.status, roles: u.roles, twoFactorEnabled: false } };
  });
}
