import { and, desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, truncateAll } from "../../db/test-utils";
import { settings } from "../core/schema";
import { customers, messages } from "../engagement/schema";
import { listAuditEntries } from "./audit";
import { hashPassword, verifyPassword } from "./crypto";
import { registerCustomer } from "./customer-auth";
import { outboxResetLinkDelivery } from "./otp-delivery";
import { requestPasswordReset, resetPassword } from "./password-reset";
import { passwordResetTokens, staffUsers } from "./schema";
import { AUTH_SETTINGS } from "./seed";
import { createSession, validateSession } from "./session";

const { db, close } = createTestDb();
const deps = { delivery: outboxResetLinkDelivery(db) };
const meta = { ip: "198.51.100.7" };
const NEW_PW = "almond-lantern-harbour-42";
let clock = new Date("2026-09-27T12:00:00Z").getTime();
const tick = (ms = 1000) => new Date((clock += ms));

async function lastLink(to: string): Promise<string> {
  const [m] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.to, to), eq(messages.eventKey, "auth.password_reset")))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return (m!.payload as { url: string }).url;
}
const tokenOf = (url: string) => new URL(url).searchParams.get("token")!;

let customerId: string;
let customerToken: string;
let staffId: string;

beforeAll(async () => {
  await truncateAll(db);
  await db.insert(settings).values(Object.entries(AUTH_SETTINGS).map(([key, value]) => ({ key, value })));
  const r = await registerCustomer(
    db,
    { email: "sara@example.ps", password: "old-olive-press-19", locale: "en" },
    meta,
    tick(),
  );
  if (!r.ok) throw new Error("register failed");
  customerId = r.customerId;
  customerToken = r.token;
  const [u] = await db
    .insert(staffUsers)
    .values({
      email: "clerk@example.ps",
      name: "Clerk",
      passwordHash: await hashPassword("temporary-pass-000"),
      mustChangePassword: true,
    })
    .returning({ id: staffUsers.id });
  staffId = u!.id;
});
afterAll(() => close());

describe("password reset", () => {
  it("unknown email answers exactly like a known one and sends nothing", async () => {
    expect(await requestPasswordReset(db, "nobody@example.ps", "customer", meta, deps, tick())).toEqual({ ok: true });
    expect(await db.select().from(messages).where(eq(messages.to, "nobody@example.ps"))).toHaveLength(0);
  });

  it("customer: link in the outbox (locale path), token hash only, works once, sessions revoked", async () => {
    expect(await requestPasswordReset(db, "Sara@Example.PS", "customer", meta, deps, tick())).toEqual({ ok: true });
    const url = await lastLink("sara@example.ps");
    expect(url).toMatch(/\/en\/reset-password\?token=/);
    const token = tokenOf(url);
    const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.subjectId, customerId));
    expect(JSON.stringify(rows)).not.toContain(token);

    expect(await resetPassword(db, token, NEW_PW, meta, tick())).toMatchObject({ ok: true, subjectType: "customer" });
    const [c] = await db.select().from(customers).where(eq(customers.id, customerId));
    expect(await verifyPassword(c!.passwordHash!, NEW_PW)).toBe(true);
    expect(await validateSession(db, customerToken, "customer", tick())).toBeNull();

    expect(await resetPassword(db, token, "another-fine-passphrase-8", meta, tick())).toEqual({
      ok: false,
      error: "invalid_token",
    });
  });

  it("breached password refused without consuming the token", async () => {
    await requestPasswordReset(db, "sara@example.ps", "customer", meta, deps, tick());
    const token = tokenOf(await lastLink("sara@example.ps"));
    expect(await resetPassword(db, token, "Password123!", meta, tick())).toMatchObject({
      ok: false,
      error: "weak_password",
      problems: expect.arrayContaining(["breached"]),
    });
    expect(await resetPassword(db, token, "second-cedar-orchard-5", meta, tick())).toMatchObject({ ok: true });
  });

  it("expired after 60 min; a newer request supersedes the older token", async () => {
    await requestPasswordReset(db, "sara@example.ps", "customer", meta, deps, tick());
    const old = tokenOf(await lastLink("sara@example.ps"));
    await requestPasswordReset(db, "sara@example.ps", "customer", meta, deps, tick());
    const fresh = tokenOf(await lastLink("sara@example.ps"));
    expect(await resetPassword(db, old, NEW_PW + "x", meta, tick())).toEqual({ ok: false, error: "invalid_token" });
    expect(await resetPassword(db, fresh, NEW_PW + "x", meta, tick(60 * 60_000))).toEqual({
      ok: false,
      error: "invalid_token",
    });
  });

  it("staff: staff link path, policy `staff` (min 12), must_change_password cleared, sessions revoked, audited", async () => {
    const s = await createSession(db, { type: "staff", id: staffId }, {}, tick());
    await requestPasswordReset(db, "clerk@example.ps", "staff", meta, deps, tick());
    const url = await lastLink("clerk@example.ps");
    expect(url).toMatch(/\/ar\/staff\/reset-password\?token=/);
    const token = tokenOf(url);
    expect(await resetPassword(db, token, "short-pw-9", meta, tick())).toMatchObject({
      ok: false,
      problems: expect.arrayContaining(["too_short"]),
    });
    expect(await resetPassword(db, token, "copper-kettle-morning-77", meta, tick())).toMatchObject({ ok: true });
    const [u] = await db.select().from(staffUsers).where(eq(staffUsers.id, staffId));
    expect(u!.mustChangePassword).toBe(false);
    expect(await validateSession(db, s.token, "staff", tick())).toBeNull();
    const entries = await listAuditEntries(db, { targetType: "staff_user", targetId: staffId, limit: 10 });
    expect(entries.map((e) => e.action)).toContain("auth.password_reset");
  });

  it("a customer token cannot reset the staff account with the same email (separate subject types)", async () => {
    expect(await requestPasswordReset(db, "clerk@example.ps", "customer", meta, deps, tick())).toEqual({ ok: true });
    expect(
      await db
        .select()
        .from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.subjectType, "customer"), eq(passwordResetTokens.subjectId, staffId))),
    ).toHaveLength(0);
  });

  it("6th request for one identity within the hour → rate_limited", async () => {
    const t = new Date("2026-09-28T08:00:00Z");
    for (let i = 0; i < 5; i++) {
      expect(await requestPasswordReset(db, "rl@example.ps", "customer", { ip: `203.0.113.${i}` }, deps, t)).toEqual({
        ok: true,
      });
    }
    expect(await requestPasswordReset(db, "rl@example.ps", "customer", { ip: "203.0.113.50" }, deps, t)).toMatchObject({
      ok: false,
      error: "rate_limited",
    });
  });
});
