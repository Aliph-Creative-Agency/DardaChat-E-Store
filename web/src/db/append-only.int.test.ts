import { eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newOrderReference } from "../lib/ids";
import type { DbOrTx } from "./connection";
import { withErasure } from "./guards";
import {
  auditEntries,
  cashRemittances,
  creditNotes,
  deliveryZones,
  invoices,
  locations,
  orderEvents,
  orders,
  payments,
  products,
  remittanceAllocations,
  staffUsers,
  stockMovements,
  variants,
} from "./schema";
import { createTestDb, expectConstraintViolation, truncateAll } from "./test-utils";

const { db, close } = createTestDb();

/** One row per append-only table: table, its SQL name, the inserted id, and a column (SQL name) safe to update. */
interface Target {
  name: string;
  table: PgTable;
  id: string;
  column: string;
  value: string;
}
const targets: Target[] = [];

beforeAll(async () => {
  await truncateAll(db);
  const [staff] = await db
    .insert(staffUsers)
    .values({ email: "owner@example.test", name: "Owner", passwordHash: "$argon2id$stub" })
    .returning();
  const [loc] = await db
    .insert(locations)
    .values({ code: "STORE", nameAr: "المخزن", nameEn: "Store room", kind: "store_room" })
    .returning();
  const [zone] = await db
    .insert(deliveryZones)
    .values({ governorate: "Hebron", nameAr: "الخليل", nameEn: "Hebron", flatRate: 2000 })
    .returning();
  const [p] = await db.insert(products).values({ slug: "ao-test", nameAr: "لعبة", nameEn: "Game" }).returning();
  const [v] = await db.insert(variants).values({ productId: p!.id, sku: "AO-1", price: 9000 }).returning();
  const [o] = await db
    .insert(orders)
    .values({
      reference: newOrderReference(),
      paymentState: "UNPAID",
      originLocationId: loc!.id,
      zoneId: zone!.id,
      subtotal: 9000,
      delivery: 2000,
      total: 11000,
      vatComponent: 1517,
      vatRateBp: 1600,
      paymentMethod: "cod",
      contactName: "Test",
      contactPhoneE164: "+970599000000",
      deliveryAddress: {},
      idempotencyKey: crypto.randomUUID(),
    })
    .returning();

  const [ev] = await db
    .insert(orderEvents)
    .values({ orderId: o!.id, machine: "fulfilment", toState: "PENDING", trigger: "placed" })
    .returning();
  const [pay] = await db
    .insert(payments)
    .values({ orderId: o!.id, method: "cod", provider: "cash", kind: "cash", status: "succeeded", amount: 11000 })
    .returning();
  const [mv] = await db
    .insert(stockMovements)
    .values({ variantId: v!.id, locationId: loc!.id, delta: 5, reason: "adjustment", note: "opening stock" })
    .returning();
  const [au] = await db
    .insert(auditEntries)
    .values({ actorType: "staff", actorId: staff!.id, action: "product.update", targetType: "products" })
    .returning();
  const [inv] = await db
    .insert(invoices)
    .values({ number: "INV-000001", orderId: o!.id, net: 9483, vat: 1517, gross: 11000, vatRateBp: 1600, snapshot: {} })
    .returning();
  const [cn] = await db
    .insert(creditNotes)
    .values({ number: "CN-000001", invoiceId: inv!.id, amount: 2000, vat: 276, reason: "correction" })
    .returning();
  const [rem] = await db
    .insert(cashRemittances)
    .values({ amount: 11000, receivedAt: new Date(), remittingParty: "Courier X", receivedByUserId: staff!.id })
    .returning();
  const [alloc] = await db
    .insert(remittanceAllocations)
    .values({ remittanceId: rem!.id, orderId: o!.id, amount: 11000, allocatedById: staff!.id })
    .returning();

  targets.push(
    { name: "order_events", table: orderEvents, id: ev!.id, column: "trigger", value: "edited" },
    { name: "payments", table: payments, id: pay!.id, column: "provider_ref", value: "edited" },
    { name: "stock_movements", table: stockMovements, id: mv!.id, column: "note", value: "edited" },
    { name: "audit_entries", table: auditEntries, id: au!.id, column: "action", value: "edited" },
    { name: "invoices", table: invoices, id: inv!.id, column: "number", value: "INV-999999" },
    { name: "credit_notes", table: creditNotes, id: cn!.id, column: "number", value: "CN-999999" },
    { name: "cash_remittances", table: cashRemittances, id: rem!.id, column: "remitting_party", value: "edited" },
    { name: "remittance_allocations", table: remittanceAllocations, id: alloc!.id, column: "amount", value: "1" },
  );
});
afterAll(() => close());

const update = async (db: DbOrTx, t: Target): Promise<void> => {
  await db.execute(sql`update ${sql.identifier(t.name)} set ${sql.identifier(t.column)} = ${t.value} where id = ${t.id}`);
};
const remove = async (db: DbOrTx, t: Target): Promise<void> => {
  await db.execute(sql`delete from ${sql.identifier(t.name)} where id = ${t.id}`);
};

describe("append-only tables (010-append-only.sql)", () => {
  it("covers all 8 tables", () => {
    expect(targets.map((t) => t.name)).toHaveLength(8);
  });

  it("refuses UPDATE and DELETE on every table, naming <table>_append_only", async () => {
    for (const t of targets) {
      await expectConstraintViolation(update(db, t), `${t.name}_append_only`);
      await expectConstraintViolation(remove(db, t), `${t.name}_append_only`);
    }
  });

  it("allows UPDATE inside withErasure but still refuses DELETE there", async () => {
    for (const t of targets) {
      await withErasure(db, (tx) => update(tx, t));
      const [row] = await db.execute<{ v: string }>(
        sql`select ${sql.identifier(t.column)}::text as v from ${sql.identifier(t.name)} where id = ${t.id}`,
      );
      expect(row?.v, t.name).toBe(t.value);
      await expectConstraintViolation(
        withErasure(db, (tx) => remove(tx, t)),
        `${t.name}_append_only`,
      );
    }
  });

  it("switches erasure off again after withErasure, even inside an outer transaction", async () => {
    const t = targets[0]!;
    await expectConstraintViolation(
      db.transaction(async (tx) => {
        await withErasure(tx, (inner) => update(inner, { ...t, value: "during" }));
        await update(tx, { ...t, value: "after" }); // must be refused
      }),
      `${t.name}_append_only`,
    );
  });

  it("refuses TRUNCATE unless dardachat.test_reset is on", async () => {
    await expect(db.execute(sql`truncate audit_entries`)).rejects.toThrow();
    const [row] = await db.execute<{ n: number }>(sql`select count(*)::int as n from audit_entries`);
    expect(row?.n).toBe(1);
  });

  it("lets invoices and credit notes change only their e-invoice fields", async () => {
    for (const t of targets.filter((x) => x.name === "invoices" || x.name === "credit_notes")) {
      await db.execute(
        sql`update ${sql.identifier(t.name)} set submission_reference = 'TA-123', clearance_status = 'cleared' where id = ${t.id}`,
      );
      await expectConstraintViolation(
        db.execute(
          sql`update ${sql.identifier(t.name)} set clearance_status = 'rejected', issued_at = now() - interval '1 day' where id = ${t.id}`,
        ),
        `${t.name}_append_only`,
      );
    }
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, targets.find((x) => x.name === "invoices")!.id));
    expect(inv?.clearanceStatus).toBe("cleared");
    expect(inv?.submissionReference).toBe("TA-123");
  });
});
