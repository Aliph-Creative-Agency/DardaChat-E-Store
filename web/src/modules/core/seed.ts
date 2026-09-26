import type { SeedContext } from "../../db/seed-types";
import { settings } from "./schema";

/**
 * Shop-wide settings defaults (placeholder values — the Owner changes them in the back office). Keys are the contract
 * other modules read; money in agorot.
 */
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  // FR-INV-009/010: stock held for an unpaid prepaid order
  "inventory.reservation_ttl_minutes": 30,
  // FR-PAY-004 / FR-ADR-007: global cash-on-delivery ceiling (a zone's cod_max_total may lower it) — ₪1,000
  "payments.cod_max_total": 100_000,
  // FR-CRT-001/002: anonymous carts live at least 30 days
  "storefront.cart_ttl_days": 30,
  "shop.currency": "ILS",
  "shop.default_locale": "ar",
};

export async function seed({ db }: SeedContext): Promise<void> {
  await db
    .insert(settings)
    .values(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })))
    .onConflictDoNothing({ target: settings.key });
}
