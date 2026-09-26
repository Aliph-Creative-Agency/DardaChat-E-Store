import { and, eq } from "drizzle-orm";
import type { SeedContext } from "../../db/seed-types";
import { variants } from "../catalog/schema";
import { SEED_PRODUCTS } from "../catalog/seed-data";
import { locations, stockLevels, stockMovements, suppliers } from "./schema";

/** The two stock origins (FR-INV-001, FR-ADR-009). Codes are the natural key other seeds and tests use. */
export const SEED_LOCATIONS = [
  { code: "STORE", nameAr: "المخزن", nameEn: "Store room", kind: "store_room", isOrigin: true },
  { code: "HOME", nameAr: "المخزون المنزلي", nameEn: "Household stock", kind: "household", isOrigin: true },
] as const;

export const SEED_SUPPLIER = {
  name: "مطبعة الأمل — Al-Amal Press (placeholder)",
  contactName: "Placeholder contact",
  phoneE164: "+970599000001",
  paymentTerms: "50% on order, 50% on delivery",
  leadTimeDays: 21,
  notes: "Placeholder supplier for the prototype.",
};

export async function seed({ db }: SeedContext): Promise<void> {
  await db
    .insert(locations)
    .values(SEED_LOCATIONS.map((l) => ({ ...l })))
    .onConflictDoNothing({ target: locations.code });

  const [supplier] = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.name, SEED_SUPPLIER.name));
  if (!supplier) await db.insert(suppliers).values(SEED_SUPPLIER);

  // Opening stock: one `adjustment` movement + the matching stock_levels row, in one transaction, only where no
  // stock_levels row exists yet (keeps Σ movements = on_hand per variant × location).
  const locs = await db.select({ id: locations.id, code: locations.code }).from(locations);
  for (const p of SEED_PRODUCTS) {
    const [variant] = await db.select({ id: variants.id }).from(variants).where(eq(variants.sku, p.variant.sku));
    if (!variant) continue;
    for (const [code, qty] of Object.entries(p.openingStock)) {
      const loc = locs.find((l) => l.code === code);
      if (!loc || qty <= 0) continue;
      const [level] = await db
        .select({ id: stockLevels.id })
        .from(stockLevels)
        .where(and(eq(stockLevels.variantId, variant.id), eq(stockLevels.locationId, loc.id)));
      if (level) continue;
      await db.transaction(async (tx) => {
        await tx.insert(stockMovements).values({
          variantId: variant.id,
          locationId: loc.id,
          delta: qty,
          reason: "adjustment",
          note: "Opening stock (seed)",
          referenceType: "adjustment",
        });
        await tx.insert(stockLevels).values({ variantId: variant.id, locationId: loc.id, onHand: qty, safetyThreshold: 3 });
      });
    }
  }
}
