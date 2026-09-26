import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, truncateAll } from "../../db/test-utils";
import { customers } from "../engagement/schema";
import { hashToken } from "./crypto";
import {
  createSession,
  markSecondFactor,
  purgeExpiredSessions,
  revokeAllSessions,
  rotateSession,
  sessionCookie,
  validateSession,
} from "./session";
import { sessions, staffUsers } from "./schema";

const { db, close } = createTestDb();
const t0 = new Date("2026-09-26T08:00:00Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const at = (ms: number) => new Date(t0.getTime() + ms);
let staffId: string;
let customerId: string;

beforeEach(async () => {
  await truncateAll(db);
  staffId = (await db.insert(staffUsers).values({ email: "s@sess.test", name: "S", passwordHash: "x" }).returning())[0]!.id;
  customerId = (await db.insert(customers).values({ email: "c@sess.test" }).returning())[0]!.id;
});
afterAll(() => close());

describe("sessions", () => {
  it("stores only the token hash", async () => {
    const { token, session } = await createSession(db, { type: "staff", id: staffId }, { ip: "1.2.3.4" }, t0);
    expect(session.tokenHash).toBe(hashToken(token));
    const all = JSON.stringify(await db.select().from(sessions));
    expect(all).not.toContain(token);
  });

  it("staff idle: 11h59m ok, then 12h01m after the last activity rejected (NFR-SEC-010)", async () => {
    const { token } = await createSession(db, { type: "staff", id: staffId }, {}, t0);
    expect(await validateSession(db, token, "staff", at(11 * HOUR + 59 * MIN))).not.toBeNull();
    // activity at 11:59 moved last_seen_at; idle is measured from there
    expect(await validateSession(db, token, "staff", at(11 * HOUR + 59 * MIN + 12 * HOUR + MIN))).toBeNull();
  });

  it("staff idle from creation: 12h01m rejected", async () => {
    const { token } = await createSession(db, { type: "staff", id: staffId }, {}, t0);
    expect(await validateSession(db, token, "staff", at(12 * HOUR + MIN))).toBeNull();
  });

  it("absolute expiry even with continuous activity", async () => {
    const { token } = await createSession(db, { type: "staff", id: staffId }, {}, t0);
    for (let h = 10; h < 7 * 24; h += 10) expect(await validateSession(db, token, "staff", at(h * HOUR))).not.toBeNull();
    expect(await validateSession(db, token, "staff", at(7 * 24 * HOUR + MIN))).toBeNull();
  });

  it("wrong subject type, unknown and empty tokens are rejected", async () => {
    const { token } = await createSession(db, { type: "customer", id: customerId }, {}, t0);
    expect(await validateSession(db, token, "staff", t0)).toBeNull();
    expect(await validateSession(db, "nope", "customer", t0)).toBeNull();
    expect(await validateSession(db, "", "customer", t0)).toBeNull();
    expect(await validateSession(db, token, "customer", t0)).not.toBeNull();
  });

  it("rotation invalidates the old token; markSecondFactor stamps the new one", async () => {
    const a = await createSession(db, { type: "staff", id: staffId }, {}, t0);
    const b = await markSecondFactor(db, a.session, {}, at(MIN));
    expect(await validateSession(db, a.token, "staff", at(2 * MIN))).toBeNull();
    const s = await validateSession(db, b.token, "staff", at(2 * MIN));
    expect(s?.secondFactorAt?.toISOString()).toBe(at(MIN).toISOString());
    expect(s?.rotatedFrom).toBe(a.session.id);
    const c = await rotateSession(db, b.session, {}, at(3 * MIN));
    expect((await validateSession(db, c.token, "staff", at(3 * MIN)))?.secondFactorAt).not.toBeNull();
  });

  it("suspended staff and disabled customer are rejected on the next validate", async () => {
    const s = await createSession(db, { type: "staff", id: staffId }, {}, t0);
    const c = await createSession(db, { type: "customer", id: customerId }, {}, t0);
    await db.update(staffUsers).set({ status: "suspended" }).where(eq(staffUsers.id, staffId));
    await db.update(customers).set({ status: "disabled" }).where(eq(customers.id, customerId));
    expect(await validateSession(db, s.token, "staff", at(MIN))).toBeNull();
    expect(await validateSession(db, c.token, "customer", at(MIN))).toBeNull();
  });

  it("revokeAllSessions signs the subject out everywhere", async () => {
    const a = await createSession(db, { type: "staff", id: staffId }, {}, t0);
    const b = await createSession(db, { type: "staff", id: staffId }, {}, t0);
    expect(await revokeAllSessions(db, "staff", staffId, at(MIN))).toBe(2);
    expect(await validateSession(db, a.token, "staff", at(MIN))).toBeNull();
    expect(await validateSession(db, b.token, "staff", at(MIN))).toBeNull();
  });

  it("purgeExpiredSessions removes long-dead rows only", async () => {
    await createSession(db, { type: "staff", id: staffId }, {}, t0);
    const live = await createSession(db, { type: "staff", id: staffId }, {}, at(8 * 24 * HOUR));
    expect(await purgeExpiredSessions(db, at(9 * 24 * HOUR))).toBe(1);
    expect(await validateSession(db, live.token, "staff", at(8 * 24 * HOUR + MIN))).not.toBeNull();
  });

  it("cookie descriptors", () => {
    expect(sessionCookie("customer")).toMatchObject({ name: "dc_session", httpOnly: true, sameSite: "lax", path: "/" });
    expect(sessionCookie("staff").name).toBe("dc_staff_session");
  });
});
