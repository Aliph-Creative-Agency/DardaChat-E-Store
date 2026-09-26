import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newOrderReference } from "../lib/ids";
import { deliveryZones, invoices, locations, numberSeries, orders, payments, vatRates } from "./schema";
import { createTestDb, expectConstraintViolation, truncateAll } from "./test-utils";

// max 60 connections so 50 callers really run concurrently
const { db, close } = createTestDb(60);

let orderId = "";

beforeAll(async () => {
  await truncateAll(db);
  await db.insert(numberSeries).values([
    { key: "invoice", prefix: "INV-" },
    { key: "credit_note", prefix: "CN-" },
  ]);
  const [loc] = await db
    .insert(locations)
    .values({ code: "STORE", nameAr: "المخزن", nameEn: "Store room", kind: "store_room" })
    .returning();
  const [zone] = await db
    .insert(deliveryZones)
    .values({ governorate: "Hebron", nameAr: "الخليل", nameEn: "Hebron", flatRate: 2000 })
    .returning();
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
      paymentMethod: "card",
      contactName: "Test",
      contactPhoneE164: "+970599000000",
      deliveryAddress: {},
      idempotencyKey: crypto.randomUUID(),
    })
    .returning();
  orderId = o!.id;
});
afterAll(() => close());

describe("payments + invoicing schema", () => {
  it("allocates 1..50 with no gap or duplicate under 50 concurrent callers", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        db.transaction(async (tx) => {
          const [row] = await tx.execute<{ n: number }>(sql`select next_series_number('invoice') as n`);
          return Number(row!.n);
        }),
      ),
    );
    expect([...results].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    // the credit-note series is independent
    const [cn] = await db.execute<{ n: number }>(sql`select next_series_number('credit_note') as n`);
    expect(Number(cn!.n)).toBe(1);
  });

  it("returns the number to the series when the transaction rolls back", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql`select next_series_number('invoice')`);
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    const [row] = await db.execute<{ n: number; f: string }>(
      sql`select next_series_number('invoice') as n, format_series_number('invoice', 51) as f`,
    );
    expect(Number(row!.n)).toBe(51);
    expect(row!.f).toBe("INV-000051");
    await expect(db.execute(sql`select next_series_number('nope')`)).rejects.toThrow();
  });

  it("enforces invoice arithmetic, one VAT rate per date and webhook de-duplication", async () => {
    await db.insert(vatRates).values({ rateBp: 1600, effectiveFrom: "2020-01-01" });
    await expectConstraintViolation(
      db.insert(vatRates).values({ rateBp: 1700, effectiveFrom: "2020-01-01" }),
      "vat_rates_effective_from_unique",
    );
    await expectConstraintViolation(
      db.insert(invoices).values({ number: "INV-X", orderId, net: 9483, vat: 1517, gross: 12379, vatRateBp: 1600, snapshot: {} }),
      "invoices_amounts_ck",
    );
    await db.insert(invoices).values({ number: "INV-000001", orderId, net: 9483, vat: 1517, gross: 11000, vatRateBp: 1600, snapshot: {} });

    const evt = { orderId, method: "card" as const, provider: "mock", providerRef: "pi_1", kind: "capture" as const, status: "succeeded" as const, amount: 11000 };
    await db.insert(payments).values(evt);
    await expectConstraintViolation(db.insert(payments).values(evt), "payments_provider_event_uq");
  });
});
