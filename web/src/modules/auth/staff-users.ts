import { asc, eq } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { roles, staffUsers, totpSecrets, userRoles } from "./schema";

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
