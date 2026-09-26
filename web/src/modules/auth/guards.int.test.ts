import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "../../db/seed";
import { createTestDb, testDatabaseUrl, truncateAll } from "../../db/test-utils";
import { customers } from "../engagement/schema";
import { COOKIE_NAMES } from "./config";
import { can, decideStaff, getRouteMeta, makeStaffRoute, readCookie, resolveCustomer } from "./guards";
import { staffUsers } from "./schema";
import { createSession, markSecondFactor } from "./session";

const { db, close } = createTestDb();
const staffRoute = makeStaffRoute(() => db);
let ownerId: string;
let staffId: string;
let ownerToken: string;
let staffToken: string;
let pendingToken: string;
let customerToken: string;

async function fullSession(id: string) {
  const s = await createSession(db, { type: "staff", id });
  return (await markSecondFactor(db, s.session)).token;
}

beforeAll(async () => {
  await truncateAll(db);
  await runSeed(testDatabaseUrl(), {
    staff: {
      owner: { email: "owner@g.test", password: "owner-pw-guard-test" },
      staff: { email: "staff@g.test", password: "staff-pw-guard-test" },
    },
    log: () => {},
  });
  ownerId = (await db.select().from(staffUsers).where(eq(staffUsers.email, "owner@g.test")))[0]!.id;
  staffId = (await db.select().from(staffUsers).where(eq(staffUsers.email, "staff@g.test")))[0]!.id;
  ownerToken = await fullSession(ownerId);
  staffToken = await fullSession(staffId);
  pendingToken = (await createSession(db, { type: "staff", id: ownerId })).token;
  const [c] = await db.insert(customers).values({ email: "c@g.test" }).returning();
  customerToken = (await createSession(db, { type: "customer", id: c!.id })).token;
}, 120_000);
afterAll(() => close());

describe("guards", () => {
  it("no cookie → unauthenticated", async () => {
    expect(await decideStaff(db, undefined, "orders.read")).toMatchObject({ ok: false, reason: "unauthenticated" });
  });

  it("a customer cookie never passes the staff guard", async () => {
    expect(await decideStaff(db, customerToken, "orders.read")).toMatchObject({ ok: false, reason: "unauthenticated" });
    expect(await resolveCustomer(db, customerToken)).not.toBeNull();
  });

  it("password-only staff session → two_factor_required, for the owner too (FR-ACC-012)", async () => {
    expect(await decideStaff(db, pendingToken, "dashboard.view")).toMatchObject({
      ok: false,
      reason: "two_factor_required",
    });
  });

  it("staff without the permission → forbidden; with it → ok", async () => {
    expect(await decideStaff(db, staffToken, "users.manage")).toMatchObject({ ok: false, reason: "forbidden" });
    expect(await decideStaff(db, staffToken, "orders.write")).toMatchObject({ ok: true });
  });

  it("owner with permission → ok", async () => {
    expect(await decideStaff(db, ownerToken, "users.manage")).toMatchObject({ ok: true });
  });

  it("unknown permission is denied for the owner too (FR-ACC-010)", async () => {
    expect(await can(db, ownerId, "catalog.delete_everything")).toBe(false);
    expect(await decideStaff(db, ownerToken, "catalog.delete_everything")).toMatchObject({
      ok: false,
      reason: "forbidden",
    });
  });

  it("a grant removed in the DB is denied at runtime", async () => {
    expect(await can(db, staffId, "returns.write")).toBe(true);
    await db.execute(sql`delete from role_permissions using permissions p, roles r
      where p.id = role_permissions.permission_id and r.id = role_permissions.role_id
        and r.key = 'staff' and p.key = 'returns.write'`);
    expect(await can(db, staffId, "returns.write")).toBe(false);
  });

  it("staffRoute: 401 / 403 / 200 and carries its permission", async () => {
    const handler = staffRoute("users.manage", async (_req, { staff }) => Response.json({ id: staff.id }));
    expect(getRouteMeta(handler)).toEqual({ permission: "users.manage" });
    const req = (token?: string) =>
      new Request("http://x/api/admin/users", {
        headers: token ? { cookie: `a=b; ${COOKIE_NAMES.staff}=${token}` } : {},
      });
    expect((await handler(req())).status).toBe(401);
    expect((await handler(req(pendingToken))).status).toBe(401);
    expect((await handler(req(staffToken))).status).toBe(403);
    const ok = await handler(req(ownerToken));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ id: ownerId });
  });

  it("readCookie", () => {
    const r = new Request("http://x", { headers: { cookie: "x=1; dc_session=a%2Bb; y=2" } });
    expect(readCookie(r, "dc_session")).toBe("a+b");
    expect(readCookie(r, "nope")).toBeNull();
  });
});
