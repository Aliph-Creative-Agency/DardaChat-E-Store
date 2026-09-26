import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz, updatedAt } from "../../db/columns";
import { variants } from "../catalog/schema";
import { customers } from "../engagement/schema";

/**
 * Carts (FR-CRT-001/002). Anonymous carts are keyed by an opaque `anon_token` (hash stored, raw value in a cookie)
 * and live ≥ 30 days; on sign-in they merge into the customer's cart and `merged_into_id` points at the survivor.
 * A cart holds no stock — reservation happens at order placement (FR-INV-004).
 */
export const carts = pgTable(
  "carts",
  {
    id: id(),
    customerId: uuid().references(() => customers.id, { onDelete: "cascade" }),
    anonTokenHash: text().unique("carts_anon_token_hash_unique"),
    expiresAt: tstz()
      .notNull()
      .$defaultFn(() => new Date(Date.now() + 30 * 86_400_000)), // ≥ 30 days (FR-CRT-002); app-side default avoids push churn
    mergedIntoId: uuid(), // self-reference (no FK to keep drizzle's self-reference typing simple)
    convertedAt: tstz(), // set when the cart became an order
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("carts_customer_idx").on(t.customerId),
    // one live cart per customer
    uniqueIndex("carts_customer_live_uq")
      .on(t.customerId)
      .where(sql`${t.customerId} is not null and ${t.mergedIntoId} is null and ${t.convertedAt} is null`),
    check("carts_owner_ck", sql`${t.customerId} is not null or ${t.anonTokenHash} is not null`),
  ],
);

export const cartLines = pgTable(
  "cart_lines",
  {
    id: id(),
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    addedAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("cart_lines_cart_variant_uq").on(t.cartId, t.variantId),
    check("cart_lines_qty_ck", sql`${t.quantity} > 0`),
  ],
);
