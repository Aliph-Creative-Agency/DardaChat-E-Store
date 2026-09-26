import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newOrderReference } from "../lib/ids";
import {
  deliveryOutcomes,
  deliveryZones,
  locations,
  orderEvents,
  orderLines,
  orders,
  products,
  shipments,
  variants,
} from "./schema";
import { createTestDb, expectConstraintViolation, truncateAll } from "./test-utils";

const { db, close } = createTestDb();

let originId = "";
let zoneId = "";
let variantId = "";

beforeAll(async () => {
  await truncateAll(db);
  const [loc] = await db
    .insert(locations)
    .values({ code: "STORE", nameAr: "المخزن", nameEn: "Store room", kind: "store_room" })
    .returning();
  originId = loc!.id;
  const [zone] = await db
    .insert(deliveryZones)
    .values({ governorate: "Ramallah and Al-Bireh", nameAr: "رام الله والبيرة", nameEn: "Ramallah & Al-Bireh", flatRate: 2000 })
    .returning();
  zoneId = zone!.id;
  const [p] = await db.insert(products).values({ slug: "ord-test", nameAr: "لعبة", nameEn: "Game" }).returning();
  const [v] = await db.insert(variants).values({ productId: p!.id, sku: "ORD-1", price: 9000 }).returning();
  variantId = v!.id;
});
afterAll(() => close());

function orderValues(over: Partial<typeof orders.$inferInsert> = {}): typeof orders.$inferInsert {
  // 2 × 45.00 = 90.00, discount 0, delivery 20.00 → total 110.00, VAT at 16% contained = 15.17 (SRS example)
  return {
    reference: newOrderReference(),
    paymentState: "UNPAID",
    originLocationId: originId,
    zoneId,
    subtotal: 9000,
    discount: 0,
    delivery: 2000,
    total: 11000,
    vatComponent: 1517,
    vatRateBp: 1600,
    paymentMethod: "cod",
    contactName: "سارة",
    contactPhoneE164: "+970599123456",
    deliveryAddress: { governorate: "Ramallah and Al-Bireh", locality: "البيرة", line1: "شارع القدس" },
    idempotencyKey: crypto.randomUUID(),
    ...over,
  };
}

describe("orders + delivery schema", () => {
  it("stores an order with a line, an event, a shipment and an outcome", async () => {
    const [o] = await db.insert(orders).values(orderValues()).returning();
    expect(o!.status).toBe("PENDING");
    expect(o!.currency).toBe("ILS");
    const [line] = await db
      .insert(orderLines)
      .values({
        orderId: o!.id,
        variantId,
        sku: "ORD-1",
        productNameAr: "لعبة",
        productNameEn: "Game",
        quantity: 2,
        unitPrice: 4500,
        lineTotal: 9000,
        lineVat: 1241,
      })
      .returning();
    expect(line!.shortfallQty).toBe(0);
    await db.insert(orderEvents).values({ orderId: o!.id, machine: "fulfilment", toState: "PENDING", trigger: "placed" });
    const [sh] = await db.insert(shipments).values({ orderId: o!.id, originLocationId: originId }).returning();
    await db.insert(deliveryOutcomes).values({ shipmentId: sh!.id, orderId: o!.id, outcome: "delivered" });
    // FR-ORD-015: failed outcome without reason refused
    await expectConstraintViolation(
      db.insert(deliveryOutcomes).values({ shipmentId: sh!.id, orderId: o!.id, outcome: "refused" }),
      "delivery_outcomes_reason_ck",
    );
    // shortfall beyond quantity refused
    await expectConstraintViolation(
      db.insert(orderLines).values({
        orderId: o!.id,
        variantId,
        sku: "ORD-1",
        productNameAr: "لعبة",
        productNameEn: "Game",
        quantity: 1,
        shortfallQty: 2,
        unitPrice: 4500,
        lineTotal: 4500,
        lineVat: 621,
      }),
      "order_lines_shortfall_ck",
    );
  });

  it("rejects an order violating subtotal − discount + delivery = total", async () => {
    await expectConstraintViolation(db.insert(orders).values(orderValues({ total: 12379 })), "orders_total_ck");
    await expectConstraintViolation(
      db.insert(orders).values(orderValues({ discount: 10000, total: 1000 })),
      "orders_amounts_ck",
    );
  });

  it("rejects a duplicate idempotency key and a duplicate reference", async () => {
    const key = "checkout-abc-123";
    await db.insert(orders).values(orderValues({ idempotencyKey: key }));
    await expectConstraintViolation(
      db.insert(orders).values(orderValues({ idempotencyKey: key })),
      "orders_idempotency_key_unique",
    );
    const ref = newOrderReference();
    await db.insert(orders).values(orderValues({ reference: ref }));
    await expectConstraintViolation(db.insert(orders).values(orderValues({ reference: ref })), "orders_reference_unique");
  });

  it("refuses a state outside Appendix A and a duplicate zone", async () => {
    await expect(
      db.insert(orders).values(orderValues({ status: "REFUNDED" as never })),
    ).rejects.toThrow(); // REFUNDED is a payment state, not a fulfilment state
    await expectConstraintViolation(
      db.insert(deliveryZones).values({ governorate: "Ramallah and Al-Bireh", nameAr: "x", nameEn: "x", flatRate: 1 }),
      "delivery_zones_governorate_uq",
    );
  });
});
