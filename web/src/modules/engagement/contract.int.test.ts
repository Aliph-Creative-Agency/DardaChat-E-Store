import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditEntries, customers, messages } from "../../db/schema";
import { createTestDb } from "../../db/test-utils";
import { resetAndSeed } from "../core/test-seed";
import {
  findCustomerByContact,
  getCustomer,
  hasConsent,
  listAddresses,
  listConsents,
  notify,
  recordConsent,
  saveAddress,
  upsertCustomer,
} from "./index";

const { db, close } = createTestDb();
const ctx = { db };

beforeAll(() => resetAndSeed(db));
afterAll(close);

describe("engagement contract (seeded test DB)", () => {
  it("upsert twice with the same phone → one customer; fills a missing email", async () => {
    const a = await upsertCustomer({ name: "ليلى", phone: "+970599111222", locale: "ar" }, ctx);
    const b = await upsertCustomer({ name: "Other", phone: "+970 599 111 222", email: "Layla@Example.com", locale: "en" }, ctx);
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.customer.id).toBe(a.customer.id);
    expect(b.customer.name).toBe("ليلى"); // never overwritten
    expect(b.customer.email).toBe("layla@example.com");
    const rows = await db.select().from(customers).where(eq(customers.phoneE164, "+970599111222"));
    expect(rows).toHaveLength(1);
    expect((await findCustomerByContact({ email: "LAYLA@example.com" }, ctx))?.id).toBe(a.customer.id);
    expect(await findCustomerByContact({ phone: "+970599000000" }, ctx)).toBeNull();
    await expect(upsertCustomer({ phone: "0599111222", locale: "ar" }, ctx)).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("customer writes are journalled to ctx.actor", async () => {
    const { customer } = await upsertCustomer({ phone: "+970599333444", locale: "ar" }, ctx);
    await upsertCustomer({ phone: "+970599333444", name: "سامي", locale: "ar" }, { db, actor: { type: "customer", id: customer.id } });
    const audit = await db.select().from(auditEntries).where(eq(auditEntries.targetId, customer.id));
    expect(audit.some((e) => e.actorType === "customer" && e.actorId === customer.id)).toBe(true);
  });

  it("notify order.confirmation (locale ar) → 1 outbox row with Arabic text via WhatsApp", async () => {
    const { customer } = await upsertCustomer({ name: "ليلى", phone: "+970599555666", locale: "ar" }, ctx);
    const orderId = "6f1d8a52-0000-4000-8000-000000000001";
    const res = await notify("order.confirmation", { customerId: customer.id }, { orderId, reference: "DC-7K3M-Q9TX", total: 11000 }, ctx);
    expect(res.messageIds).toHaveLength(1);
    const rows = await db.select().from(messages).where(eq(messages.customerId, customer.id));
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.channel).toBe("whatsapp");
    expect(row.status).toBe("sent");
    expect(row.locale).toBe("ar");
    expect(row.dedupeKey).toBe(`order.confirmation:${orderId}`);
    const text = (row.payload as { text: string }).text;
    expect(text).toMatch(/[؀-ۿ]/);
    expect(text).toContain("DC-7K3M-Q9TX");
    expect(text).toContain("110.00");
    // Same event + order again: deduped, no new row.
    const again = await notify("order.confirmation", { customerId: customer.id }, { orderId, reference: "DC-7K3M-Q9TX" }, ctx);
    expect(again.messageIds).toEqual(res.messageIds);
    expect(await db.select().from(messages).where(eq(messages.customerId, customer.id))).toHaveLength(1);
  });

  it("notify with phone + email in English sends two groups; no contact → no ids", async () => {
    const res = await notify("account.welcome", { phone: "+970599777888", email: "new@example.com", locale: "en" }, { name: "Sam" }, ctx);
    expect(res.messageIds).toHaveLength(2);
    const rows = await db.select().from(messages).where(eq(messages.to, "new@example.com"));
    expect((rows[0]!.payload as { text: string }).text).toContain("Hi Sam");
    const { customer } = await upsertCustomer({ email: "x@example.com", locale: "ar" }, ctx);
    await db.update(customers).set({ status: "erased" }).where(eq(customers.id, customer.id));
    expect((await notify("order.delivered", { customerId: customer.id }, {}, ctx)).messageIds).toEqual([]);
  });

  it("consent grant → revoke → hasConsent false; latest per purpose wins", async () => {
    const { customer } = await upsertCustomer({ phone: "+970599999000", locale: "ar" }, ctx);
    expect(await hasConsent(customer.id, "whatsapp", "marketing", ctx)).toBe(false);
    await recordConsent({ customerId: customer.id, channel: "whatsapp", purpose: "marketing", granted: true, source: "checkout" }, ctx);
    expect(await hasConsent(customer.id, "whatsapp", "marketing", ctx)).toBe(true);
    expect(await hasConsent(customer.id, "sms", "marketing", ctx)).toBe(false);
    // Revoke inside the same transaction: still ordered correctly (clock_timestamp).
    await db.transaction(async (tx) => {
      await recordConsent({ customerId: customer.id, channel: "whatsapp", purpose: "marketing", granted: false, source: "account" }, { db: tx });
    });
    expect(await hasConsent(customer.id, "whatsapp", "marketing", ctx)).toBe(false);
    await recordConsent({ customerId: customer.id, purpose: "terms", granted: true, source: "checkout", policyVersion: "1" }, ctx);
    const current = await listConsents(customer.id, {}, ctx);
    expect(current.map((c) => [c.purpose, c.granted])).toEqual([
      ["marketing_whatsapp", false],
      ["terms", true],
    ]);
    expect(await listConsents(customer.id, { history: true }, ctx)).toHaveLength(3);
  });

  it("addresses: first is default, a new default clears the old one, update in place", async () => {
    const { customer } = await upsertCustomer({ phone: "+970599000111", locale: "ar" }, ctx);
    const base = { recipientName: "ليلى", phone: "+970599000111", governorate: "Ramallah and Al-Bireh", locality: "البيرة", line1: "شارع النهضة" };
    const first = await saveAddress(customer.id, base, ctx);
    expect(first.isDefault).toBe(true);
    const second = await saveAddress(customer.id, { ...base, locality: "رام الله", isDefault: true }, ctx);
    const list = await listAddresses(customer.id, ctx);
    expect(list.map((a) => [a.id, a.isDefault])).toEqual([
      [second.id, true],
      [first.id, false],
    ]);
    const edited = await saveAddress(customer.id, { ...base, id: first.id, landmark: "قرب المسجد" }, ctx);
    expect(edited.landmark).toBe("قرب المسجد");
    expect(edited.isDefault).toBe(false);
    await expect(saveAddress(customer.id, { ...base, line1: " " }, ctx)).rejects.toMatchObject({ code: "invalid_input" });
    expect(await getCustomer(customer.id, ctx)).toMatchObject({ phone: "+970599000111", locale: "ar" });
  });
});
