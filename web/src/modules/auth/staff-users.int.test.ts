import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "../../db/seed";
import { createTestDb, testDatabaseUrl, truncateAll } from "../../db/test-utils";
import { listAuditEntries } from "./audit";
import { encryptSecret } from "./crypto";
import { can } from "./guards";
import { staffUsers, totpSecrets } from "./schema";
import { createSession, markSecondFactor, validateSession } from "./session";
import { signInStaff } from "./staff-auth";
import {
  changeStaffRole,
  createStaffUser,
  listStaffUsers,
  reinstateStaffUser,
  resetStaffTwoFactor,
  revokeStaffUser,
  suspendStaffUser,
} from "./staff-users";

const { db, close } = createTestDb();
const meta = { ip: "192.0.2.44" };
let owner: { id: string };
let staff: { id: string };

async function fullSession(id: string) {
  const s = await createSession(db, { type: "staff", id });
  return (await markSecondFactor(db, s.session)).token;
}
const idOf = async (email: string) => (await db.select().from(staffUsers).where(eq(staffUsers.email, email)))[0]!.id;

beforeAll(async () => {
  await truncateAll(db);
  await runSeed(testDatabaseUrl(), {
    staff: {
      owner: { email: "owner@u.test", password: "owner-pw-users-test" },
      staff: { email: "staff@u.test", password: "staff-pw-users-test" },
    },
    log: () => {},
  });
  owner = { id: await idOf("owner@u.test") };
  staff = { id: await idOf("staff@u.test") };
}, 120_000);
afterAll(() => close());

describe("createStaffUser", () => {
  it("with a temp password: returned once, must change, can sign in; audited", async () => {
    const r = await createStaffUser(db, owner, { email: "New.Clerk@U.test", name: "New Clerk", role: "staff" }, meta);
    if (!r.ok) throw new Error(r.error);
    expect(r.tempPassword).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
    const [u] = await db.select().from(staffUsers).where(eq(staffUsers.id, r.id));
    expect(u).toMatchObject({ email: "new.clerk@u.test", mustChangePassword: true, status: "active" });
    const s = await signInStaff(db, { email: "new.clerk@u.test", password: r.tempPassword! }, meta);
    expect(s).toMatchObject({ ok: true, next: "enrol", mustChangePassword: true });
    const [e] = await listAuditEntries(db, { actorId: owner.id, limit: 1 });
    expect(e).toMatchObject({ action: "staff.create", actorType: "staff", actorId: owner.id, targetType: "staff_user", targetId: r.id });
    expect(e!.after).toMatchObject({ email: "new.clerk@u.test", role: "staff" });
    expect(JSON.stringify(e)).not.toContain(r.tempPassword);
  });

  it("refuses weak passwords, duplicates (any case), unknown roles and empty names", async () => {
    expect(await createStaffUser(db, owner, { email: "a@u.test", name: "A", role: "staff", password: "password1" })).toMatchObject(
      { ok: false, error: "weak_password" },
    );
    expect(await createStaffUser(db, owner, { email: "STAFF@u.test", name: "B", role: "staff" })).toEqual({
      ok: false,
      error: "email_taken",
    });
    expect(await createStaffUser(db, owner, { email: "c@u.test", name: "C", role: "admin" })).toEqual({
      ok: false,
      error: "unknown_role",
    });
    expect(await createStaffUser(db, owner, { email: "d@u.test", name: "  ", role: "staff" })).toMatchObject({
      ok: false,
      error: "invalid_input",
    });
  });
});

describe("suspend / reinstate / revoke", () => {
  it("each takes effect on the next validateSession; revoked cannot be reinstated; history survives", async () => {
    const r = await createStaffUser(db, owner, { email: "temp@u.test", name: "Temp", role: "staff" });
    if (!r.ok) throw new Error(r.error);
    const token = await fullSession(r.id);
    expect(await validateSession(db, token, "staff")).not.toBeNull();

    expect(await suspendStaffUser(db, owner, r.id, meta)).toEqual({ ok: true });
    expect(await validateSession(db, token, "staff")).toBeNull();
    expect(await suspendStaffUser(db, owner, r.id, meta)).toEqual({ ok: false, error: "invalid_state" });

    expect(await reinstateStaffUser(db, owner, r.id, meta)).toEqual({ ok: true });
    const token2 = await fullSession(r.id);
    expect(await validateSession(db, token2, "staff")).not.toBeNull();

    await db.insert(totpSecrets).values({ userId: r.id, secretEncrypted: encryptSecret("X"), confirmedAt: new Date() });
    expect(await revokeStaffUser(db, owner, r.id, meta)).toEqual({ ok: true });
    expect(await validateSession(db, token2, "staff")).toBeNull();
    expect(await db.select().from(totpSecrets).where(eq(totpSecrets.userId, r.id))).toHaveLength(0);
    expect(await reinstateStaffUser(db, owner, r.id, meta)).toEqual({ ok: false, error: "invalid_state" });
    expect((await listStaffUsers(db)).find((u) => u.id === r.id)).toMatchObject({ status: "revoked" });

    const history = await listAuditEntries(db, { targetId: r.id });
    expect(history.map((e) => e.action).sort()).toEqual(
      ["staff.create", "staff.reinstate", "staff.revoke", "staff.suspend"].sort(),
    );
    const revoke = history.find((e) => e.action === "staff.revoke")!;
    expect(revoke).toMatchObject({ actorId: owner.id, targetType: "staff_user", ip: meta.ip });
    expect(revoke.before).toMatchObject({ status: "active" });
    expect(revoke.after).toMatchObject({ status: "revoked" });
    expect(revoke.occurredAt).toBeInstanceOf(Date);
  });

  it("no action on yourself; never zero active owners; not_found", async () => {
    expect(await suspendStaffUser(db, owner, owner.id)).toEqual({ ok: false, error: "self_action" });
    // a non-owner actor (e.g. staff granted users.manage later) cannot remove the last owner
    expect(await suspendStaffUser(db, staff, owner.id)).toEqual({ ok: false, error: "last_owner" });
    expect(await revokeStaffUser(db, staff, owner.id)).toEqual({ ok: false, error: "last_owner" });
    expect(await changeStaffRole(db, staff, owner.id, "staff")).toEqual({ ok: false, error: "last_owner" });
    expect(await suspendStaffUser(db, owner, "00000000-0000-0000-0000-000000000000")).toEqual({
      ok: false,
      error: "not_found",
    });
    // refusals are not audited
    expect(await listAuditEntries(db, { targetId: owner.id })).toHaveLength(0);
  });
});

describe("changeStaffRole / resetStaffTwoFactor", () => {
  it("role change applies to the next permission check", async () => {
    expect(await can(db, staff.id, "users.manage")).toBe(false);
    expect(await changeStaffRole(db, owner, staff.id, "owner", meta)).toEqual({ ok: true });
    expect(await can(db, staff.id, "users.manage")).toBe(true);
    expect(await changeStaffRole(db, owner, staff.id, "staff", meta)).toEqual({ ok: true });
    expect(await can(db, staff.id, "users.manage")).toBe(false);
    const [e] = await listAuditEntries(db, { targetId: staff.id, limit: 1 });
    expect(e).toMatchObject({ action: "staff.role_change", before: { roles: ["owner"] }, after: { roles: ["staff"] } });
  });

  it("reset 2FA forgets the authenticator and signs the user out", async () => {
    await db.insert(totpSecrets).values({ userId: staff.id, secretEncrypted: encryptSecret("Y"), confirmedAt: new Date() });
    const token = await fullSession(staff.id);
    expect(await resetStaffTwoFactor(db, owner, staff.id, meta)).toEqual({ ok: true });
    expect(await validateSession(db, token, "staff")).toBeNull();
    expect((await listStaffUsers(db)).find((u) => u.id === staff.id)).toMatchObject({ twoFactorEnabled: false });
    expect(await signInStaff(db, { email: "staff@u.test", password: "staff-pw-users-test" }, meta)).toMatchObject({
      ok: true,
      next: "enrol",
    });
  });
});
