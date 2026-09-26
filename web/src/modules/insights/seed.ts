import type { SeedContext } from "../../db/seed-types";
import { retentionSettings } from "./schema";

/** Retention defaults (§5.3, FR-DAT-*, FR-JRN-*). Placeholders until the privacy regime is confirmed (BACKLOG). */
export const SEED_RETENTION = [
  { category: "journey_results", months: 60, note: "Journey results linked to a consenting customer" },
  { category: "journey_anonymous", days: 90, note: "Anonymous Journey sessions and results" },
  { category: "carts_anonymous", days: 30, note: "Guest carts (FR-CRT-001: at least 30 days)" },
] as const;

export async function seed({ db }: SeedContext): Promise<void> {
  await db
    .insert(retentionSettings)
    .values(SEED_RETENTION.map((r) => ({ ...r })))
    .onConflictDoNothing({ target: retentionSettings.category });
}
