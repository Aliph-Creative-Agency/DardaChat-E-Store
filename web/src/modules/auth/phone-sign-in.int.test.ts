import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, truncateAll } from "../../db/test-utils";
import { settings } from "../core/schema";
import { customers, messages } from "../engagement/schema";
import { requestPhoneSignIn, verifyPhoneSignIn } from "./customer-auth";
import { outboxOtpDelivery } from "./otp-delivery";
import { AUTH_SETTINGS } from "./seed";
import { validateSession } from "./session";

const { db, close } = createTestDb();
const deps = { delivery: outboxOtpDelivery(db) };
const E164 = "+970591234567";
let clock = new Date("2026-09-27T10:00:00Z").getTime();
const tick = () => new Date((clock += 1000));

async function codeFor(to: string): Promise<string> {
  const [m] = await db.select().from(messages).where(eq(messages.to, to)).orderBy(desc(messages.createdAt)).limit(1);
  return (m!.payload as { code: string }).code;
}

async function signIn(input: string, ip: string) {
  const meta = { ip, userAgent: "vitest", locale: "ar" as const };
  const req = await requestPhoneSignIn(db, input, meta, deps, tick());
  expect(req.ok).toBe(true);
  return verifyPhoneSignIn(db, input, await codeFor(E164), meta, tick());
}

beforeAll(async () => {
  await truncateAll(db);
  await db.insert(settings).values(Object.entries(AUTH_SETTINGS).map(([key, value]) => ({ key, value })));
});
afterAll(() => close());

describe("phone + OTP sign-in", () => {
  it("a brand-new number signs in with no password; account created with a verified phone", async () => {
    const r = await signIn("+970 59 123 4567", "198.51.100.1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await validateSession(db, r.token, "customer", tick())).not.toBeNull();
    const [c] = await db.select().from(customers).where(eq(customers.id, r.customerId));
    expect(c).toMatchObject({ phoneE164: E164, passwordHash: null, email: null, status: "active" });
    expect(c!.phoneVerifiedAt).not.toBeNull();
  });

  it("+970 59…, 0097059… and 059… reach the same account", async () => {
    const ids = new Set<string>();
    for (const [i, input] of ["+970 59-123-4567", "00970591234567", "0591234567", "٠٥٩١٢٣٤٥٦٧"].entries()) {
      const r = await signIn(input, `198.51.100.${10 + i}`);
      if (!r.ok) throw new Error(`sign-in failed for ${input}: ${r.error}`);
      ids.add(r.customerId);
    }
    expect(ids.size).toBe(1);
    expect(await db.select().from(customers).where(eq(customers.phoneE164, E164))).toHaveLength(1);
  });

  it("wrong code → invalid_code; invalid number → invalid_phone (same for request)", async () => {
    const meta = { ip: "198.51.100.30", locale: "en" as const };
    expect(await requestPhoneSignIn(db, "12ab", meta, deps, tick())).toEqual({ ok: false, error: "invalid_phone" });
    await requestPhoneSignIn(db, "0591234567", meta, deps, tick());
    const code = await codeFor(E164);
    const wrong = code === "000000" ? "111111" : "000000";
    expect(await verifyPhoneSignIn(db, "0591234567", wrong, meta, tick())).toEqual({ ok: false, error: "invalid_code" });
  });

  it("disabled and erased customers are refused after a correct code", async () => {
    for (const status of ["disabled", "erased"] as const) {
      await db.update(customers).set({ status }).where(eq(customers.phoneE164, E164));
      const r = await signIn("0591234567", `198.51.100.${40 + (status === "erased" ? 1 : 0)}`);
      expect(r).toEqual({ ok: false, error: "account_disabled" });
    }
    await db.update(customers).set({ status: "active" }).where(eq(customers.phoneE164, E164));
  });
});
