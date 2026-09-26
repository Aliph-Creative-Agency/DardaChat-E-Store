import { hash } from "@node-rs/argon2";
import { eq, inArray, sql } from "drizzle-orm";
import type { SeedContext } from "../../db/seed-types";
import { settings } from "../core/schema";
import { DEFAULT_PASSWORD_MIN_LENGTH, PASSWORD_SETTING_KEYS } from "./password-policy";
import { grantsFor, PERMISSION_KEYS, PERMISSIONS } from "./permissions";
import { permissions, rolePermissions, roles, staffUsers, userRoles } from "./schema";

/** Auth settings (insert-if-missing; the Owner may change them later). */
export const AUTH_SETTINGS: Record<string, unknown> = {
  [PASSWORD_SETTING_KEYS.staff]: DEFAULT_PASSWORD_MIN_LENGTH.staff,
  [PASSWORD_SETTING_KEYS.customer]: DEFAULT_PASSWORD_MIN_LENGTH.customer,
  "auth.otp_whatsapp_enabled": true,
};

/** Role keys. Permissions and role→permission grants belong to the auth permission registry (deny by default). */
export const SEED_ROLES = [
  { key: "owner", nameAr: "المالك", nameEn: "Owner" },
  { key: "staff", nameAr: "موظف", nameEn: "Staff" },
] as const;

export async function seed({ db, staff }: SeedContext): Promise<void> {
  await db.insert(roles).values([...SEED_ROLES]).onConflictDoNothing({ target: roles.key });
  await db
    .insert(settings)
    .values(Object.entries(AUTH_SETTINGS).map(([key, value]) => ({ key, value })))
    .onConflictDoNothing({ target: settings.key });
  await syncPermissions(db);

  const accounts = [
    { ...staff.owner, name: "Owner", role: "owner" },
    { ...staff.staff, name: "Staff", role: "staff" },
  ];
  for (const account of accounts) {
    const email = account.email.toLowerCase();
    let [user] = await db
      .select({ id: staffUsers.id })
      .from(staffUsers)
      .where(eq(sql`lower(${staffUsers.email})`, email));
    if (!user) {
      // hash only on first insert: an existing account keeps whatever password it has now
      [user] = await db
        .insert(staffUsers)
        .values({ email, name: account.name, passwordHash: await hash(account.password) })
        .returning({ id: staffUsers.id });
    }
    const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, account.role));
    await db
      .insert(userRoles)
      .values({ userId: user!.id, roleId: role!.id })
      .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
  }
}

/**
 * Registry → `permissions` rows (insert-if-missing). Owner: an explicit grant for every key, always ensured.
 * Staff: default grants only for permission rows created in this run, so a grant the Owner removed later is never
 * re-added by a re-seed.
 */
export async function syncPermissions(db: SeedContext["db"]): Promise<void> {
  const created = await db
    .insert(permissions)
    .values(PERMISSION_KEYS.map((key) => ({ key, description: PERMISSIONS[key].descEn })))
    .onConflictDoNothing({ target: permissions.key })
    .returning({ id: permissions.id, key: permissions.key });
  const createdKeys = new Set(created.map((c) => c.key));
  const all = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(inArray(permissions.key, PERMISSION_KEYS));
  const idByKey = new Map(all.map((p) => [p.key, p.id]));
  for (const role of SEED_ROLES) {
    const [r] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, role.key));
    const keys = grantsFor(role.key).filter((k) => role.key === "owner" || createdKeys.has(k));
    if (!r || keys.length === 0) continue;
    await db
      .insert(rolePermissions)
      .values(keys.map((k) => ({ roleId: r.id, permissionId: idByKey.get(k)! })))
      .onConflictDoNothing({ target: [rolePermissions.roleId, rolePermissions.permissionId] });
  }
}
