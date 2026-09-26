import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { newOrderReference } from "../lib/ids";
import { withActor, withErasure } from "./guards";
import { addresses, auditEntries, customers, deliveryZones, locations, orders, products, staffUsers, variants } from "./schema";
import { createTestDb, truncateAll } from "./test-utils";

const { db, close } = createTestDb();

let staffId = "";
let customerId = "";
let addressId = "";
let orderId = "";
let variantId = "";

const journal = (targetType: string, targetId: string) =>
  db
    .select()
    .from(auditEntries)
    .where(and(eq(auditEntries.targetType, targetType), eq(auditEntries.targetId, targetId)));

beforeAll(async () => {
  await truncateAll(db);
  const [staff] = await db
    .insert(staffUsers)
    .values({ email: "staff@example.test", name: "Staff", passwordHash: "$argon2id$stub" })
    .returning();
  staffId = staff!.id;
  const [c] = await db
    .insert(customers)
    .values({ phoneE164: "+970599111222", name: "ليلى", passwordHash: "$argon2id$secret-hash" })
    .returning();
  customerId = c!.id;
  const [a] = await db
    .insert(addresses)
    .values({
      customerId,
      recipientName: "ليلى",
      phoneE164: "+970599111222",
      governorate: "Ramallah and Al-Bireh",
      locality: "البيرة",
      line1: "شارع القدس",
      landmark: "بجانب المسجد",
    })
    .returning();
  addressId = a!.id;
  const [loc] = await db
    .insert(locations)
    .values({ code: "STORE", nameAr: "المخزن", nameEn: "Store room", kind: "store_room" })
    .returning();
  const [zone] = await db
    .insert(deliveryZones)
    .values({ governorate: "Ramallah and Al-Bireh", nameAr: "رام الله", nameEn: "Ramallah", flatRate: 2000 })
    .returning();
  const [p] = await db.insert(products).values({ slug: "jr-test", nameAr: "لعبة", nameEn: "Game" }).returning();
  const [v] = await db.insert(variants).values({ productId: p!.id, sku: "JR-1", price: 9000 }).returning();
  variantId = v!.id;
  const [o] = await db
    .insert(orders)
    .values({
      reference: newOrderReference(),
      customerId,
      paymentState: "UNPAID",
      originLocationId: loc!.id,
      zoneId: zone!.id,
      subtotal: 9000,
      delivery: 2000,
      total: 11000,
      vatComponent: 1517,
      vatRateBp: 1600,
      paymentMethod: "cod",
      contactName: "ليلى",
      contactPhoneE164: "+970599111222",
      deliveryAddress: {},
      idempotencyKey: crypto.randomUUID(),
    })
    .returning();
  orderId = o!.id;
});
beforeEach(async () => {
  // inserts are not journalled; start every test from an empty journal
  const rows = await db.select().from(auditEntries);
  expect(rows).toHaveLength(0);
});
afterAll(() => close());

/** audit_entries is append-only; the test-reset switch is the only way to empty it between tests. */
async function resetJournal() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('dardachat.test_reset', 'on', true)`);
    await tx.execute(sql`truncate audit_entries`);
  });
}

describe("row journal (015-journal.sql)", () => {
  it("journals an order status change and an address correction exactly once each, with before/after and actor", async () => {
    await withActor(db, { type: "staff", id: staffId }, async (tx) => {
      await tx.update(orders).set({ status: "COD_CONFIRMED", updatedAt: new Date() }).where(eq(orders.id, orderId));
      await tx.update(addresses).set({ line1: "شارع النهضة", updatedAt: new Date() }).where(eq(addresses.id, addressId));
    });

    const orderRows = await journal("orders", orderId);
    expect(orderRows).toHaveLength(1);
    expect(orderRows[0]).toMatchObject({
      action: "row.update",
      actorType: "staff",
      actorId: staffId,
      before: { status: "PENDING" },
      after: { status: "COD_CONFIRMED" },
    });

    const addressRows = await journal("addresses", addressId);
    expect(addressRows).toHaveLength(1);
    expect(addressRows[0]).toMatchObject({
      action: "row.update",
      actorType: "staff",
      actorId: staffId,
      before: { line1: "شارع القدس" },
      after: { line1: "شارع النهضة" },
    });
    // only changed columns (updated_at is ignored)
    expect(Object.keys(addressRows[0]!.after as object)).toEqual(["line1"]);

    await resetJournal();
  });

  it("records system as actor when none is set, skips no-op and ignored-only updates", async () => {
    await db.update(variants).set({ price: 9500 }).where(eq(variants.id, variantId));
    await db.update(variants).set({ price: 9500 }).where(eq(variants.id, variantId)); // no change
    await db.update(customers).set({ lastLoginAt: new Date() }).where(eq(customers.id, customerId)); // ignored col
    const rows = await db.select().from(auditEntries);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      targetType: "variants",
      actorType: "system",
      actorId: null,
      before: { price: 9000 },
      after: { price: 9500 },
    });
    await resetJournal();
  });

  it("redacts password hashes and does not copy erased personal data", async () => {
    await withActor(db, { type: "customer", id: customerId }, (tx) =>
      tx.update(customers).set({ passwordHash: "$argon2id$new-hash" }).where(eq(customers.id, customerId)),
    );
    await withErasure(db, (tx) =>
      tx
        .update(customers)
        .set({ name: null, phoneE164: null, erasedAt: new Date() })
        .where(eq(customers.id, customerId)),
    );
    const rows = await journal("customers", customerId);
    expect(rows).toHaveLength(2);
    const update = rows.find((r) => r.action === "row.update")!;
    expect(update).toMatchObject({
      actorType: "customer",
      before: { password_hash: "[redacted]" },
      after: { password_hash: "[redacted]" },
    });
    const erase = rows.find((r) => r.action === "row.erase")!;
    expect(erase.before).toBeNull();
    expect(erase.after).toEqual({ columns: ["erased_at", "name", "phone_e_164"] });
    expect(JSON.stringify(rows)).not.toContain("ليلى");
    expect(JSON.stringify(rows)).not.toContain("+970599111222");
  });
});

