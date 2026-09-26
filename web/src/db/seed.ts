/**
 * Seed runner: every module's `src/modules/<m>/seed.ts` in dependency order. Idempotent — running it twice leaves the
 * data unchanged (each module inserts only what is missing, by natural key).
 * CLI: `npm run db:seed` (dev) / `npm run db:seed -- --test`; `npm run db:reset` = drop schema → setup → seed.
 */
import { seed as seedAssistant } from "../modules/assistant/seed";
import { seed as seedAuth } from "../modules/auth/seed";
import { seed as seedCatalog } from "../modules/catalog/seed";
import { seed as seedCore } from "../modules/core/seed";
import { seed as seedEngagement } from "../modules/engagement/seed";
import { seed as seedInsights } from "../modules/insights/seed";
import { seed as seedInventory } from "../modules/inventory/seed";
import { seed as seedJourney } from "../modules/journey/seed";
import { seed as seedOrders } from "../modules/orders/seed";
import { seed as seedPayments } from "../modules/payments/seed";
import { seed as seedStorefront } from "../modules/storefront/seed";
import { createDb } from "./connection";
import type { ModuleSeed, SeedContext } from "./seed-types";

/** Order matters: auth before anything attributed to staff, catalog before inventory (stock per variant),
 * inventory before orders (zones point at a default origin). */
export const MODULE_SEEDS: ReadonlyArray<readonly [string, ModuleSeed]> = [
  ["core", seedCore],
  ["auth", seedAuth],
  ["catalog", seedCatalog],
  ["inventory", seedInventory],
  ["orders", seedOrders],
  ["payments", seedPayments],
  ["insights", seedInsights],
  ["engagement", seedEngagement],
  ["storefront", seedStorefront],
  ["assistant", seedAssistant],
  ["journey", seedJourney],
];

export async function runSeed(url: string, opts: Omit<SeedContext, "db" | "log"> & { log?: (m: string) => void }) {
  const { db, client } = createDb(url, { max: 1 });
  const ctx: SeedContext = { db, staff: opts.staff, log: opts.log ?? (() => {}) };
  try {
    for (const [name, seed] of MODULE_SEEDS) {
      await seed(ctx);
      ctx.log(`seeded ${name}`);
    }
  } finally {
    await client.end();
  }
}
