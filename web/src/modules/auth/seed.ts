import { hash } from "@node-rs/argon2";
import { eq, sql } from "drizzle-orm";
import type { SeedContext } from "../../db/seed-types";
import { roles, staffUsers, userRoles } from "./schema";

/** Role keys. Permissions and role→permission grants belong to the auth permission registry (deny by default). */
export const SEED_ROLES = [
  { key: "owner", nameAr: "المالك", nameEn: "Owner" },
  { key: "staff", nameAr: "موظف", nameEn: "Staff" },
] as const;

export async function seed({ db, staff }: SeedContext): Promise<void> {
  await db.insert(roles).values([...SEED_ROLES]).onConflictDoNothing({ target: roles.key });

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
