import type { SeedContext } from "../../db/seed-types";
import { locations } from "./schema";

/** The two stock origins (FR-INV-001, FR-ADR-009). Codes are the natural key other seeds and tests use. */
export const SEED_LOCATIONS = [
  { code: "STORE", nameAr: "المخزن", nameEn: "Store room", kind: "store_room", isOrigin: true },
  { code: "HOME", nameAr: "المخزون المنزلي", nameEn: "Household stock", kind: "household", isOrigin: true },
] as const;

export async function seed({ db }: SeedContext): Promise<void> {
  await db
    .insert(locations)
    .values(SEED_LOCATIONS.map((l) => ({ ...l })))
    .onConflictDoNothing({ target: locations.code });
}
