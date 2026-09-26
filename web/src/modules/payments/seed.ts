import type { SeedContext } from "../../db/seed-types";
import { numberSeries, vatRates } from "./schema";

/** Palestinian VAT 16% (FR-CUR-006); a future change is a NEW row with a later effective_from. */
export const SEED_VAT_RATES = [{ rateBp: 1600, effectiveFrom: "2020-01-01" }] as const;

/** Gapless document series (FR-ORD-024), allocated with `next_series_number(key)` (030-number-series.sql). */
export const SEED_NUMBER_SERIES = [
  { key: "invoice", prefix: "INV-" },
  { key: "credit_note", prefix: "CN-" },
] as const;

export async function seed({ db }: SeedContext): Promise<void> {
  await db
    .insert(vatRates)
    .values(SEED_VAT_RATES.map((r) => ({ ...r })))
    .onConflictDoNothing({ target: vatRates.effectiveFrom });
  await db
    .insert(numberSeries)
    .values(SEED_NUMBER_SERIES.map((s) => ({ ...s })))
    .onConflictDoNothing({ target: numberSeries.key });
}
