/**
 * PLM-07: auth sign-up / phone sign-in and engagement's guest `upsertCustomer` must resolve the same phone/email to
 * ONE `customers` row, whichever comes first.
 */
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, truncateAll } from "../../db/test-utils";
import { settings } from "../core/schema";
import { upsertCustomer } from "../engagement";
import { customers, messages } from "../engagement/schema";
import { registerCustomer, requestPhoneSignIn, verifyPhoneSignIn } from "./customer-auth";
import { outboxOtpDelivery } from "./otp-delivery";
import { AUTH_SETTINGS } from "./seed";

const { db, close } = createTestDb();
let clock = new Date("2026-09-27T10:00:00Z").getTime();
const tick = () => new Date((clock += 1000));
const meta = { ip: "198.51.100.7", userAgent: "vitest", locale: "ar" as const };
const PASSWORD = "Zeitoun-Olive-2026!";

async function rowsWithEmail(email: string) {
  return db.select({ id: customers.id }).from(customers).where(eq(sql`lower(${customers.email})`, email));
}
async function rowsWithPhone(phone: string) {
  return db.select({ id: customers.id }).from(customers).where(eq(customers.phoneE164, phone));
}

beforeAll(async () => {
  await truncateAll(db);
  await db.insert(settings).values(Object.entries(AUTH_SETTINGS).map(([key, value]) => ({ key, value })));
});
afterAll(() => close());

describe("customer identity: auth vs engagement guest upsert", () => {
  it("guest after register (same email, different case) reuses the registered row", async () => {
    const reg = await registerCustomer(db, { email: "rana@example.test", password: PASSWORD, name: "Rana" }, meta, tick());
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const guest = await upsertCustomer({ email: "Rana@Example.test", name: "Rana G", locale: "ar" }, { db });
    expect(guest.created).toBe(false);
    expect(guest.customer.id).toBe(reg.customerId);
    expect(await rowsWithEmail("rana@example.test")).toHaveLength(1);
  });

  it("register after guest (same email) creates no second row (claim via forgot-password)", async () => {
    const guest = await upsertCustomer({ email: "sami@example.test", name: "Sami", locale: "en" }, { db });
    expect(guest.created).toBe(true);
    const reg = await registerCustomer(db, { email: "SAMI@example.test", password: PASSWORD }, meta, tick());
    expect(reg).toMatchObject({ ok: false, error: "email_taken" });
    expect(await rowsWithEmail("sami@example.test")).toHaveLength(1);
  });

  it("phone sign-in after a guest checkout with that phone reuses the guest row", async () => {
    const phone = "+970599000111";
    const guest = await upsertCustomer({ phone, name: "Huda", locale: "ar" }, { db });
    expect(guest.created).toBe(true);
    expect((await requestPhoneSignIn(db, phone, meta, { delivery: outboxOtpDelivery(db) }, tick())).ok).toBe(true);
    const [m] = await db.select().from(messages).where(eq(messages.to, phone));
    const r = await verifyPhoneSignIn(db, phone, (m!.payload as { code: string }).code, meta, tick());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.customerId).toBe(guest.customer.id);
    expect(await rowsWithPhone(phone)).toHaveLength(1);
  });

  it("guest after phone sign-in reuses the signed-in row", async () => {
    const phone = "+970599000222";
    expect((await requestPhoneSignIn(db, phone, meta, { delivery: outboxOtpDelivery(db) }, tick())).ok).toBe(true);
    const [m] = await db.select().from(messages).where(eq(messages.to, phone));
    const r = await verifyPhoneSignIn(db, phone, (m!.payload as { code: string }).code, meta, tick());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const guest = await upsertCustomer({ phone: "+970 599 000 222", name: "Omar", locale: "ar" }, { db });
    expect(guest.created).toBe(false);
    expect(guest.customer.id).toBe(r.customerId);
    expect(await rowsWithPhone(phone)).toHaveLength(1);
  });
});
