import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { businessEvents, deliveryZones, messages, orderEvents } from "../../db/schema";
import { createTestDb } from "../../db/test-utils";
import { getVariantBySku } from "../catalog";
import { resetAndSeed } from "../core/test-seed";
import { getAvailability } from "../inventory";
import {
  estimateDelivery,
  getOrder,
  listCustomerOrders,
  listDeliveryZones,
  listOrderEvents,
  placeOrder,
  quoteDeliveryFee,
  transition,
  type PlaceOrderInput,
} from "./index";

const { db, close } = createTestDb();
const ctx = { db };

let zoneId: string;
let rmd: string;
let frn: string;

beforeAll(async () => {
  await resetAndSeed(db);
  const [zone] = await db.select().from(deliveryZones).where(eq(deliveryZones.governorate, "Ramallah and Al-Bireh"));
  zoneId = zone!.id;
  rmd = (await getVariantBySku("DC-RMD-001", ctx))!.id;
  frn = (await getVariantBySku("DC-FRN-001", ctx))!.id;
});
afterAll(close);

const input = (over: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
  contact: { name: "ليلى", phone: "+970599123123" },
  locale: "ar",
  lines: [
    { variantId: rmd, qty: 1 },
    { variantId: frn, qty: 2 },
  ],
  address: { zoneId, city: "البيرة", line1: "شارع النهضة" },
  paymentMethod: "cod",
  idempotencyKey: "test-key-1",
  ...over,
});

describe("orders contract (seeded test DB)", () => {
  it("zones, fee and delivery estimate (Fridays skipped)", async () => {
    const zones = await listDeliveryZones({}, ctx);
    expect(zones.length).toBeGreaterThan(5);
    expect(await quoteDeliveryFee(zoneId, 10_000, ctx)).toBe(2000);
    // Wed 2026-09-30 (Asia/Jerusalem): +1 → Thu 10-01, +3 → Thu, Sat, Sun = 10-04 (Fri 10-02 skipped).
    const est = await estimateDelivery(zoneId, new Date("2026-09-30T09:00:00Z"), ctx);
    expect(est).toMatchObject({ minDays: 1, maxDays: 3, earliest: "2026-10-01", latest: "2026-10-04" });
  });

  it("places a COD order: reference, totals, reservation, event, outbox; idempotent replay", async () => {
    const before = await getAvailability([rmd, frn], ctx);
    const { order, replayed } = await placeOrder(input(), ctx);
    expect(replayed).toBe(false);
    expect(order.reference).toMatch(/^DC-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    // 89.00 + 2 × 69.00 + 20.00 delivery = 247.00, VAT contained: 24700 × 16/116 = 3406.9 → 34.07
    expect(order.totals).toMatchObject({ subtotal: 22700, delivery: 2000, total: 24700, vat: 3407, vatRateBp: 1600 });
    expect(order.totals.total).toBe(order.totals.subtotal - order.totals.discount + order.totals.delivery);
    expect(order.lines.map((l) => [l.sku, l.qty, l.lineTotal])).toEqual([
      ["DC-RMD-001", 1, 8900],
      ["DC-FRN-001", 2, 13800],
    ]);
    expect(order.lines[0]!.productNameAr).toMatch(/[؀-ۿ]/);
    expect(order).toMatchObject({ fulfilmentState: "COD_CONFIRMED", paymentState: "COD_DUE" });
    expect(order.address).toMatchObject({ governorate: "Ramallah and Al-Bireh", locality: "البيرة", recipientName: "ليلى" });

    const after = await getAvailability([rmd, frn], ctx);
    expect(after[0]!.available).toBe(before[0]!.available - 1);
    expect(after[1]!.available).toBe(before[1]!.available - 2);

    const events = await db.select().from(businessEvents).where(eq(businessEvents.aggregateId, order.id));
    expect(events.map((e) => e.type)).toEqual(["order.placed"]);
    const outbox = await db.select().from(messages).where(eq(messages.dedupeKey, `order.confirmation:${order.id}`));
    expect(outbox).toHaveLength(1);
    expect((outbox[0]!.payload as { text: string }).text).toContain(order.reference);

    const again = await placeOrder(input(), ctx);
    expect(again.replayed).toBe(true);
    expect(again.order.id).toBe(order.id);
    expect(await getAvailability([rmd], ctx)).toMatchObject([{ available: after[0]!.available }]);

    expect((await getOrder(order.reference.toLowerCase().replace(/-/g, " "), ctx))?.id).toBe(order.id);
    expect(await getOrder("DC-0000-0000", ctx)).toBeNull();
  });

  it("insufficient stock rolls the whole placement back", async () => {
    await expect(placeOrder(input({ idempotencyKey: "too-many", paymentMethod: "card", lines: [{ variantId: rmd, qty: 10_000 }] }), ctx)).rejects.toMatchObject({
      code: "insufficient_stock",
    });
    expect(await placeOrder(input({ idempotencyKey: "too-many", lines: [{ variantId: rmd, qty: 1 }] }), ctx)).toMatchObject({ replayed: false });
  });

  it("illegal transition → invalid_transition; legal one appends an event", async () => {
    const { order } = await placeOrder(input({ idempotencyKey: "transition-test", paymentMethod: "card" }), ctx);
    expect(order).toMatchObject({ fulfilmentState: "PENDING", paymentState: "UNPAID" });
    await expect(transition(order.id, { machine: "fulfilment", to: "DELIVERED" }, ctx)).rejects.toMatchObject({
      code: "invalid_transition",
      details: { from: "PENDING", to: "DELIVERED" },
    });
    const n = (await listOrderEvents(order.id, ctx)).length;
    const res = await transition(order.id, { machine: "fulfilment", to: "CANCELLED", trigger: "cancelled_before_payment" }, {
      db,
      actor: { type: "system" },
    });
    expect(res).toMatchObject({ from: "PENDING", to: "CANCELLED", trigger: "cancelled_before_payment" });
    const evs = await listOrderEvents(order.id, ctx);
    expect(evs).toHaveLength(n + 1);
    expect(evs.at(-1)).toMatchObject({ machine: "fulfilment", fromState: "PENDING", toState: "CANCELLED" });
    const fresh = await getOrder(order.id, ctx);
    expect(fresh?.fulfilmentState).toBe("CANCELLED");
    expect(fresh?.cancelledAt).toBeInstanceOf(Date);
    // Card orders get no confirmation until payment succeeds.
    expect(await db.select().from(messages).where(eq(messages.dedupeKey, `order.confirmation:${order.id}`))).toHaveLength(0);
    expect((await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id))).length).toBe(n + 1);
  });

  it("lists a customer's orders; rejects bad input", async () => {
    const { upsertCustomer } = await import("../engagement");
    const { customer } = await upsertCustomer({ phone: "+970599123124", locale: "en" }, ctx);
    await placeOrder(input({ idempotencyKey: "cust-1", customerId: customer.id, locale: "en" }), ctx);
    const page = await listCustomerOrders(customer.id, {}, ctx);
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ itemCount: 3, total: 24700, fulfilmentState: "COD_CONFIRMED" });
    await expect(placeOrder(input({ idempotencyKey: "bad", lines: [] }), ctx)).rejects.toMatchObject({ code: "invalid_input" });
    await expect(placeOrder(input({ idempotencyKey: "bad2", contact: { name: "x", phone: "0599" } }), ctx)).rejects.toMatchObject({
      code: "invalid_input",
    });
  });
});
