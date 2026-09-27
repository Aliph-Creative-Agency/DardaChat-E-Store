import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, truncateAll } from "../../db/test-utils";
import { customers } from "../engagement/schema";
import { AUTH_SETTINGS } from "./seed";
import { settings } from "../core/schema";
import { registerCustomer, signInCustomer, signOut } from "./customer-auth";
import { validateSession } from "./session";

const { db, close } = createTestDb();
const PW = "zeitoun-balcony-window-7";
const meta = { ip: "198.51.100.10", userAgent: "vitest" };
const spies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeAll(async () => {
  await truncateAll(db);
  await db.insert(settings).values(Object.entries(AUTH_SETTINGS).map(([key, value]) => ({ key, value })));
});
beforeEach(() => {
  for (const m of ["log", "info", "warn", "error", "debug"] as const) spies.push(vi.spyOn(console, m));
});
afterEach(() => {
  for (const s of spies) {
    for (const call of s.mock.calls) expect(JSON.stringify(call)).not.toContain(PW);
    s.mockRestore();
  }
  spies.length = 0;
});
afterAll(() => close());

describe("customer email + password", () => {
  it("register → session valid; email lower-cased; argon2id hash stored", async () => {
    const r = await registerCustomer(db, { email: "Layla@Example.PS", password: PW, name: "Layla", locale: "ar" }, meta);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await validateSession(db, r.token, "customer")).not.toBeNull();
    const [c] = await db.select().from(customers).where(eq(customers.id, r.customerId));
    expect(c!.email).toBe("layla@example.ps");
    expect(c!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(c)).not.toContain(PW);
  });

  it("duplicate email (any case) → email_taken", async () => {
    expect(await registerCustomer(db, { email: "LAYLA@example.ps", password: PW }, meta)).toEqual({
      ok: false,
      error: "email_taken",
    });
  });

  it("weak or breached password → weak_password", async () => {
    const r = await registerCustomer(db, { email: "b@example.ps", password: "Password123!" }, meta);
    expect(r).toMatchObject({ ok: false, error: "weak_password" });
  });

  it("sign in ok; wrong password and unknown email get the same generic error", async () => {
    const ok = await signInCustomer(db, { email: "layla@example.ps", password: PW }, meta);
    expect(ok.ok).toBe(true);
    const wrong = await signInCustomer(db, { email: "layla@example.ps", password: "nope-nope-nope" }, meta);
    const unknown = await signInCustomer(db, { email: "ghost@example.ps", password: PW }, meta);
    expect(wrong).toEqual({ ok: false, error: "invalid_credentials" });
    expect(unknown).toEqual(wrong);
  });

  it("sign out revokes the session", async () => {
    const r = await signInCustomer(db, { email: "layla@example.ps", password: PW }, meta);
    if (!r.ok) throw new Error("sign-in failed");
    await signOut(db, r.token);
    expect(await validateSession(db, r.token, "customer")).toBeNull();
  });

  it("disabled customer cannot sign in", async () => {
    await db.update(customers).set({ status: "disabled" }).where(eq(customers.email, "layla@example.ps"));
    expect(await signInCustomer(db, { email: "layla@example.ps", password: PW }, meta)).toEqual({
      ok: false,
      error: "invalid_credentials",
    });
    await db.update(customers).set({ status: "active" }).where(eq(customers.email, "layla@example.ps"));
  });

  it("the 11th attempt for one identity within 15 min → rate_limited", async () => {
    const t = new Date("2026-09-27T09:00:00Z");
    for (let i = 0; i < 10; i++) {
      const r = await signInCustomer(db, { email: "rl@example.ps", password: "x-wrong-pw" }, meta, t);
      expect(r).toEqual({ ok: false, error: "invalid_credentials" });
    }
    const r = await signInCustomer(db, { email: "rl@example.ps", password: "x-wrong-pw" }, meta, t);
    expect(r).toMatchObject({ ok: false, error: "rate_limited" });
  });
});
