import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cartLines,
  carts,
  locations,
  poLines,
  poReceiptLines,
  poReceipts,
  products,
  purchaseOrders,
  reservations,
  stockLevels,
  stockMovements,
  suppliers,
  variants,
} from "./schema";
import { createTestDb, expectConstraintViolation, truncateAll } from "./test-utils";

const { db, close } = createTestDb();

let variantId = "";
let storeId = "";
let homeId = "";

beforeAll(async () => {
  await truncateAll(db);
  const [p] = await db.insert(products).values({ slug: "inv-test", nameAr: "لعبة", nameEn: "Game" }).returning();
  const [v] = await db.insert(variants).values({ productId: p!.id, sku: "INV-1", price: 10000 }).returning();
  variantId = v!.id;
  const [s, h] = await db
    .insert(locations)
    .values([
      { code: "STORE", nameAr: "المخزن", nameEn: "Store room", kind: "store_room" },
      { code: "HOME", nameAr: "المنزل", nameEn: "Household", kind: "household" },
    ])
    .returning();
  storeId = s!.id;
  homeId = h!.id;
});
afterAll(() => close());

describe("inventory + purchasing + carts schema", () => {
  it("enforces one stock level per variant × location", async () => {
    await db.insert(stockLevels).values({ variantId, locationId: storeId, onHand: 5 });
    await db.insert(stockLevels).values({ variantId, locationId: homeId, onHand: 2 });
    await expect(db.insert(stockLevels).values({ variantId, locationId: storeId, onHand: 1 })).rejects.toThrow();
  });

  it("refuses reserved > on_hand and negative on_hand", async () => {
    await db.update(stockLevels).set({ reserved: 5 }).where(eq(stockLevels.locationId, storeId)); // = on_hand ok
    await expectConstraintViolation(
      db.update(stockLevels).set({ reserved: 6 }).where(eq(stockLevels.locationId, storeId)),
      "stock_levels_reserved_ck",
    );
    await expectConstraintViolation(
      db.update(stockLevels).set({ onHand: -1, reserved: 0 }).where(eq(stockLevels.locationId, homeId)),
      "stock_levels_on_hand_ck",
    );
  });

  it("records movements and reservations; zero delta refused", async () => {
    await db.insert(stockMovements).values({ variantId, locationId: storeId, delta: 5, reason: "adjustment", note: "opening" });
    await expect(
      db.insert(stockMovements).values({ variantId, locationId: storeId, delta: 0, reason: "adjustment" }),
    ).rejects.toThrow();
    await db.insert(reservations).values({
      orderId: crypto.randomUUID(),
      variantId,
      locationId: storeId,
      qty: 1,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
    await expect(
      db.insert(reservations).values({ orderId: crypto.randomUUID(), variantId, locationId: storeId, qty: 0 }),
    ).rejects.toThrow();
  });

  it("stores a purchase order with a partial receipt", async () => {
    const [sup] = await db.insert(suppliers).values({ name: "مطبعة الأمل", leadTimeDays: 45 }).returning();
    const [po] = await db.insert(purchaseOrders).values({ code: "PO-TEST-1", supplierId: sup!.id }).returning();
    expect(po!.status).toBe("draft");
    const [line] = await db
      .insert(poLines)
      .values({ purchaseOrderId: po!.id, variantId, qtyOrdered: 100, expectedUnitCost: 4000 })
      .returning();
    const [rc] = await db.insert(poReceipts).values({ purchaseOrderId: po!.id, locationId: storeId }).returning();
    await db.insert(poReceiptLines).values({ receiptId: rc!.id, poLineId: line!.id, qty: 40, unitCost: 4200 });
    await expect(
      db.insert(poReceiptLines).values({ receiptId: rc!.id, poLineId: line!.id, qty: 0 }),
    ).rejects.toThrow();
  });

  it("enforces cart line uniqueness and a 30-day anonymous cart", async () => {
    const [cart] = await db.insert(carts).values({ anonTokenHash: "anon-hash-1" }).returning();
    expect(cart!.expiresAt.getTime() - Date.now()).toBeGreaterThan(29.9 * 86_400_000);
    await db.insert(cartLines).values({ cartId: cart!.id, variantId, quantity: 1 });
    await expectConstraintViolation(db.insert(cartLines).values({ cartId: cart!.id, variantId, quantity: 2 }), "cart_lines_cart_variant_uq");
    await expectConstraintViolation(db.insert(carts).values({}), "carts_owner_ck");
  });
});
