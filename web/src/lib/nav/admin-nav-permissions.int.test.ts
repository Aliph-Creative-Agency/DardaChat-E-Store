import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "@/db/seed";
import { createTestDb, testDatabaseUrl, truncateAll } from "@/db/test-utils";
import { permissionsOf } from "@/modules/auth/guards";
import { isKnownPermission } from "@/modules/auth/permissions";
import { staffUsers } from "@/modules/auth/schema";
import { ADMIN_NAV, ADMIN_NAV_PERMISSIONS, filterNav } from "./admin-nav";

/**
 * Admin nav against auth's REAL registry and seeded role grants (platform merge PLM-06): the shell viewer's
 * permissions come from `permissionsOf()`, so the Owner sees every section and seeded Staff strictly fewer.
 */
const { db, close } = createTestDb();
let ownerId = "";
let staffId = "";

beforeAll(async () => {
  await truncateAll(db);
  await runSeed(testDatabaseUrl(), {
    staff: {
      owner: { email: "owner@nav.test", password: "owner-pw-nav-test" },
      staff: { email: "staff@nav.test", password: "staff-pw-nav-test" },
    },
    log: () => {},
  });
  ownerId = (await db.select().from(staffUsers).where(eq(staffUsers.email, "owner@nav.test")))[0]!.id;
  staffId = (await db.select().from(staffUsers).where(eq(staffUsers.email, "staff@nav.test")))[0]!.id;
}, 120_000);
afterAll(() => close());

describe("admin nav × auth permissions", () => {
  it("every nav permission key exists in auth's registry", () => {
    expect(ADMIN_NAV_PERMISSIONS.filter((k) => !isKnownPermission(k))).toEqual([]);
  });

  it("the seeded Owner sees every nav item", async () => {
    const perms = await permissionsOf(db, ownerId);
    expect(filterNav(ADMIN_NAV, perms)).toHaveLength(ADMIN_NAV.length);
  });

  it("seeded Staff sees fewer items than the Owner, and never Users", async () => {
    const owner = filterNav(ADMIN_NAV, await permissionsOf(db, ownerId));
    const staff = filterNav(ADMIN_NAV, await permissionsOf(db, staffId));
    expect(staff.length).toBeGreaterThan(0);
    expect(staff.length).toBeLessThan(owner.length);
    expect(staff.map((i) => i.permission)).not.toContain("users.manage");
  });

  it("an unknown user has no permissions", async () => {
    expect(await permissionsOf(db, "00000000-0000-0000-0000-000000000000")).toEqual([]);
  });
});
