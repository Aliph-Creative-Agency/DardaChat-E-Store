import { eq } from "drizzle-orm";
import { generate } from "otplib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "../../db/seed";
import { createTestDb, testDatabaseUrl, truncateAll } from "../../db/test-utils";
import { listAuditEntries } from "./audit";
import { decideStaff } from "./guards";
import { staffUsers, totpSecrets } from "./schema";
import { validateSession } from "./session";
import {
  beginTotpEnrolment,
  challengeTotp,
  changeOwnPassword,
  confirmTotpEnrolment,
  hashRecoveryCode,
  signInStaff,
} from "./staff-auth";

const { db, close } = createTestDb();
const meta = { ip: "203.0.113.9" };
const OWNER = { email: "owner@s.test", password: "owner-pw-staff-auth-test" };
const STAFF = { email: "staff@s.test", password: "staff-pw-staff-auth-test" };
const MIN = 60_000;
// aligned to a 30 s boundary + 5 s so "one step later" is unambiguous
let clock = Date.UTC(2026, 8, 27, 9, 0, 5);
const at = () => new Date(clock);
const tick = (ms = 1000) => new Date((clock += ms));
const codeAt = (secret: string, d: Date) => generate({ secret, epoch: Math.floor(d.getTime() / 1000) });

async function pending(who: { email: string; password: string }) {
  const r = await signInStaff(db, who, meta, tick());
  if (!r.ok) throw new Error(`sign-in failed: ${r.error}`);
  const s = await validateSession(db, r.token, "staff", at());
  return { ...r, session: s! };
}

let ownerSecret = "";
let recovery: string[] = [];

beforeAll(async () => {
  await truncateAll(db);
  await runSeed(testDatabaseUrl(), { staff: { owner: OWNER, staff: STAFF }, log: () => {} });
}, 120_000);
afterAll(() => close());

describe("staff sign-in", () => {
  it("a password-only session is refused by the staff guard for BOTH roles", async () => {
    for (const who of [OWNER, STAFF]) {
      const p = await pending(who);
      expect(p.next).toBe("enrol");
      expect(p.session.secondFactorAt).toBeNull();
      expect(await decideStaff(db, p.token, "dashboard.view", at())).toMatchObject({
        ok: false,
        reason: "two_factor_required",
      });
    }
  });

  it("wrong password and unknown email get the same generic error", async () => {
    expect(await signInStaff(db, { ...OWNER, password: "nope-nope-nope-1" }, meta, tick())).toEqual({
      ok: false,
      error: "invalid_credentials",
    });
    expect(await signInStaff(db, { email: "ghost@s.test", password: "x" }, meta, tick())).toEqual({
      ok: false,
      error: "invalid_credentials",
    });
  });

  it("a suspended user cannot sign in", async () => {
    await db.update(staffUsers).set({ status: "suspended" }).where(eq(staffUsers.email, STAFF.email));
    expect(await signInStaff(db, STAFF, meta, tick())).toEqual({ ok: false, error: "invalid_credentials" });
    await db.update(staffUsers).set({ status: "active" }).where(eq(staffUsers.email, STAFF.email));
  });
});

describe("TOTP enrolment", () => {
  it("begin → otpauth URI + grouped key; secret stored encrypted and unconfirmed", async () => {
    const p = await pending(OWNER);
    const e = await beginTotpEnrolment(db, p.session, at());
    if (!e.ok) throw new Error(e.error);
    expect(e.otpauthUri).toMatch(/^otpauth:\/\/totp\/DardaChat:owner%40s\.test\?/);
    expect(e.groupedSecret.replace(/ /g, "")).toBe(e.secret);
    const [row] = await db.select().from(totpSecrets).where(eq(totpSecrets.userId, p.staffId));
    expect(row!.secretEncrypted).not.toContain(e.secret);
    expect(row!.confirmedAt).toBeNull();

    // wrong code
    expect(await confirmTotpEnrolment(db, p.session, "000000", meta, tick())).toMatchObject({
      ok: false,
      error: "invalid_code",
    });
    const ok = await confirmTotpEnrolment(db, p.session, await codeAt(e.secret, at()), meta, tick());
    if (!ok.ok) throw new Error(ok.error);
    ownerSecret = e.secret;
    recovery = ok.recoveryCodes!;
    expect(recovery).toHaveLength(10);
    expect(new Set(recovery).size).toBe(10);
    const [after] = await db.select().from(totpSecrets).where(eq(totpSecrets.userId, p.staffId));
    expect(after!.confirmedAt).not.toBeNull();
    expect(after!.recoveryCodeHashes).toHaveLength(10);
    expect(JSON.stringify(after!.recoveryCodeHashes)).not.toContain(recovery[0]!.replace("-", ""));

    // rotated: the pending token is dead, the new one passes the guard
    expect(await validateSession(db, p.token, "staff", at())).toBeNull();
    expect(await decideStaff(db, ok.token, "users.manage", at())).toMatchObject({ ok: true });
  });

  it("a confirmed authenticator cannot be replaced from a password-only session", async () => {
    const p = await pending(OWNER);
    expect(p.next).toBe("challenge");
    expect(await beginTotpEnrolment(db, p.session, at())).toEqual({ ok: false, error: "already_enrolled" });
  });

  it("audits sign-in and enrolment", async () => {
    const [owner] = await db.select().from(staffUsers).where(eq(staffUsers.email, OWNER.email));
    const actions = (await listAuditEntries(db, { targetId: owner!.id, limit: 50 })).map((e) => e.action);
    expect(actions).toContain("auth.staff_sign_in");
    expect(actions).toContain("auth.2fa_enrolled");
  });
});

describe("TOTP challenge", () => {
  it("ok / wrong / replay of the same step / neighbouring step accepted after it", async () => {
    tick(16 * MIN); // fresh rate-limit window
    clock = Math.floor(clock / 30_000) * 30_000 + 5_000;
    const a = await pending(OWNER);
    expect(await challengeTotp(db, a.session, "123456", meta, at())).toMatchObject({ ok: false });
    const code = await codeAt(ownerSecret, at());
    const ok = await challengeTotp(db, a.session, code, meta, at());
    if (!ok.ok) throw new Error(ok.error);
    expect(ok.session.secondFactorAt).not.toBeNull();
    expect(await decideStaff(db, ok.token, "users.manage", at())).toMatchObject({ ok: true });

    // replay the very same code from another pending session → refused
    const b = await pending(OWNER);
    expect(await challengeTotp(db, b.session, code, meta, at())).toEqual({ ok: false, error: "invalid_code" });
    // the next step's code is fine (±1 window) and moves the floor forward
    const next = await codeAt(ownerSecret, new Date(clock + 30_000));
    expect(await challengeTotp(db, b.session, next, meta, at())).toMatchObject({ ok: true });
  });

  it("a code two steps old is outside the window", async () => {
    tick(16 * MIN);
    const p = await pending(OWNER);
    const old = await codeAt(ownerSecret, new Date(clock - 61_000));
    expect(await challengeTotp(db, p.session, old, meta, at())).toEqual({ ok: false, error: "invalid_code" });
  });

  it("a recovery code works exactly once (any case, dash optional)", async () => {
    tick(16 * MIN);
    const p = await pending(OWNER);
    const r = await challengeTotp(db, p.session, recovery[0]!.toLowerCase().replace("-", ""), meta, tick());
    expect(r).toMatchObject({ ok: true, recoveryCodesLeft: 9 });
    const q = await pending(OWNER);
    expect(await challengeTotp(db, q.session, recovery[0]!, meta, tick())).toEqual({
      ok: false,
      error: "invalid_code",
    });
    expect(hashRecoveryCode("not-a-code")).toBe("");
  });

  it("the 6th attempt in 15 minutes is rate limited", async () => {
    tick(16 * MIN);
    const p = await pending(OWNER);
    for (let i = 0; i < 5; i++) await challengeTotp(db, p.session, "000000", meta, tick());
    expect(await challengeTotp(db, p.session, recovery[1]!, meta, tick())).toMatchObject({
      ok: false,
      error: "rate_limited",
    });
  });
});

describe("changeOwnPassword", () => {
  it("checks the current password + policy, clears must_change_password, signs out other sessions", async () => {
    tick(16 * MIN);
    await db.update(staffUsers).set({ mustChangePassword: true }).where(eq(staffUsers.email, STAFF.email));
    const other = await pending(STAFF);
    const me = await pending(STAFF);
    expect(me.mustChangePassword).toBe(true);
    expect(
      await changeOwnPassword(db, me.session, { currentPassword: "wrong", newPassword: "x" }, meta, tick()),
    ).toEqual({ ok: false, error: "invalid_credentials" });
    expect(
      await changeOwnPassword(db, me.session, { currentPassword: STAFF.password, newPassword: "Password123!" }, meta, tick()),
    ).toMatchObject({ ok: false, error: "weak_password" });
    const NEW = "quiet-cedar-lantern-2026";
    expect(
      await changeOwnPassword(db, me.session, { currentPassword: STAFF.password, newPassword: NEW }, meta, tick()),
    ).toEqual({ ok: true });
    const [u] = await db.select().from(staffUsers).where(eq(staffUsers.email, STAFF.email));
    expect(u!.mustChangePassword).toBe(false);
    expect(await validateSession(db, other.token, "staff", at())).toBeNull();
    expect(await validateSession(db, me.token, "staff", at())).not.toBeNull();
    expect(await signInStaff(db, { email: STAFF.email, password: NEW }, meta, tick())).toMatchObject({ ok: true });
  });
});
