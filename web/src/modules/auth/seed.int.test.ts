import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "../../db/seed";
import { createTestDb, testDatabaseUrl, truncateAll } from "../../db/test-utils";
import { settings } from "../core/schema";
import { getPasswordMinLength } from "./password-policy";
import { grantsFor, PERMISSION_KEYS } from "./permissions";
import { permissions, rolePermissions, roles } from "./schema";

const { db, close } = createTestDb();
const staff = {
  owner: { email: "owner@seed.test", password: "owner-test-password" },
  staff: { email: "staff@seed.test", password: "staff-test-password" },
};

async function grants(role: string): Promise<string[]> {
  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
    .where(eq(roles.key, role));
  return rows.map((r) => r.key).sort();
}

beforeAll(async () => {
  await truncateAll(db);
  await runSeed(testDatabaseUrl(), { staff, log: () => {} });
}, 120_000);
afterAll(() => close());

describe("auth seed", () => {
  it("permission rows match the registry and grants match the defaults", async () => {
    const keys = (await db.select({ key: permissions.key }).from(permissions)).map((r) => r.key).sort();
    expect(keys).toEqual([...PERMISSION_KEYS].sort());
    expect(await grants("owner")).toEqual([...grantsFor("owner")].sort());
    expect(await grants("staff")).toEqual([...grantsFor("staff")].sort());
  });

  it("is idempotent and never re-adds a grant the Owner removed", async () => {
    const before = (await db.execute<{ n: number }>(sql`select count(*)::int as n from role_permissions`))[0]!.n;
    await db.execute(sql`delete from role_permissions using permissions p, roles r
      where p.id = role_permissions.permission_id and r.id = role_permissions.role_id
        and r.key = 'staff' and p.key = 'orders.write'`);
    await runSeed(testDatabaseUrl(), { staff, log: () => {} });
    const after = (await db.execute<{ n: number }>(sql`select count(*)::int as n from role_permissions`))[0]!.n;
    expect(after).toBe(before - 1);
    expect(await grants("staff")).not.toContain("orders.write");
  }, 120_000);

  it("seeds configurable password minimums that getPasswordMinLength honours", async () => {
    expect(await getPasswordMinLength(db, "staff")).toBe(12);
    expect(await getPasswordMinLength(db, "customer")).toBe(8);
    await db.update(settings).set({ value: 16 }).where(eq(settings.key, "auth.staff_password_min_length"));
    expect(await getPasswordMinLength(db, "staff")).toBe(16);
    await db.update(settings).set({ value: 12 }).where(eq(settings.key, "auth.staff_password_min_length"));
  });
});
