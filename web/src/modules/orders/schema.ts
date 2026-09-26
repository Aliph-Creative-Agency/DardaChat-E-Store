import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, localeEnum, money, tstz, updatedAt } from "../../db/columns";
import { staffUsers } from "../auth/schema";
import { variants } from "../catalog/schema";
import { customers } from "../engagement/schema";
import { locations } from "../inventory/schema";
import { FULFILMENT_STATES, PAYMENT_STATES, type FulfilmentState, type PaymentState } from "./state-machine";

// ---------------------------------------------------------------------------------------------------------------
// Delivery zones (FR-ADR-006..009)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Zone = governorate (+ optional locality override). Lookup: the row matching (governorate, locality) wins over the
 * governorate-wide row (locality null). An address matching no active zone cannot be delivered to.
 */
export const deliveryZones = pgTable(
  "delivery_zones",
  {
    id: id(),
    governorate: text().notNull(), // English key, e.g. "Ramallah and Al-Bireh"
    locality: text(),
    nameAr: text().notNull(),
    nameEn: text().notNull(),
    flatRate: money().notNull(), // agorot, VAT-inclusive
    codEligible: boolean().notNull().default(true),
    codMaxTotal: money(), // agorot; null = no zone-specific cap (global cap in settings)
    estMinDays: integer().notNull().default(1), // FR-ADR-008 delivery window
    estMaxDays: integer().notNull().default(3),
    defaultOriginId: uuid().references(() => locations.id, { onDelete: "set null" }), // FR-ADR-009 "by zone"
    isActive: boolean().notNull().default(true),
    position: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // two partial indexes instead of an expression index (drizzle-kit push churns on expression indexes)
    uniqueIndex("delivery_zones_governorate_uq").on(t.governorate).where(sql`${t.locality} is null`),
    uniqueIndex("delivery_zones_locality_uq").on(t.governorate, t.locality).where(sql`${t.locality} is not null`),
    check("delivery_zones_rate_ck", sql`${t.flatRate} >= 0`),
    check("delivery_zones_window_ck", sql`${t.estMinDays} >= 0 and ${t.estMinDays} <= ${t.estMaxDays}`),
  ],
);

// ---------------------------------------------------------------------------------------------------------------
// Orders (§5.2 Order / OrderLine, Appendix A)
// ---------------------------------------------------------------------------------------------------------------

/** Values come from Appendix A (state-machine.ts) so the DB and the pure transition tables cannot drift. */
// spread into a mutable tuple: passing the readonly `as const` array directly widens the TS type to string
export const fulfilmentStateEnum = pgEnum("orders_fulfilment_state", [...FULFILMENT_STATES] as [FulfilmentState, ...FulfilmentState[]]);
export const paymentStateEnum = pgEnum("orders_payment_state", [...PAYMENT_STATES] as [PaymentState, ...PaymentState[]]);
export const paymentMethodEnum = pgEnum("orders_payment_method", ["card", "wallet", "instant_transfer", "cod"]);

/**
 * §5.2 Order. Money in agorot; `total = subtotal − discount + delivery` enforced by `orders_total_ck`;
 * vat_component is CONTAINED in total (FR-CRT-007). vat_rate_bp = §5.2 `vat_rate` as basis points (1600 = 16%).
 * Contact + address are snapshots taken at placement (edits go through FR-ORD-013 and are journaled).
 * Journaled by 015-journal.sql.
 */
export const orders = pgTable(
  "orders",
  {
    id: id(),
    reference: text().notNull().unique(), // DC-XXXX-XXXX (src/lib/ids.ts); never an invoice number
    customerId: uuid().references(() => customers.id, { onDelete: "set null" }), // null = guest
    status: fulfilmentStateEnum().notNull().default("PENDING"),
    paymentState: paymentStateEnum().notNull(),
    originLocationId: uuid()
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    originOverriddenById: uuid().references(() => staffUsers.id, { onDelete: "set null" }), // FR-ADR-009 override
    zoneId: uuid()
      .notNull()
      .references(() => deliveryZones.id, { onDelete: "restrict" }),
    currency: text().notNull().default("ILS"),
    subtotal: money().notNull(),
    discount: money().notNull().default(0),
    delivery: money().notNull(),
    total: money().notNull(),
    vatComponent: money().notNull(),
    vatRateBp: integer().notNull(),
    discountCode: text(),
    paymentMethod: paymentMethodEnum().notNull(),
    locale: localeEnum().notNull().default("ar"),
    contactName: text().notNull(),
    contactPhoneE164: text().notNull(),
    contactEmail: text(),
    /** `{ recipientName, phoneE164, governorate, locality, line1, line2?, landmark?, notes? }` — see addresses. */
    deliveryAddress: jsonb().notNull(),
    customerNote: text(), // visible to the customer; staff-only notes live in order_notes (FR-ORD-010)
    idempotencyKey: text().notNull().unique("orders_idempotency_key_unique"), // FR-CRT-008
    placedAt: tstz().notNull().defaultNow(),
    dispatchedAt: tstz(),
    deliveredAt: tstz(),
    completedAt: tstz(),
    cancelledAt: tstz(),
    reservationExpiresAt: tstz(), // FR-INV-009, PENDING prepaid only
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_customer_idx").on(t.customerId, t.placedAt),
    index("orders_status_idx").on(t.status, t.paymentState),
    index("orders_placed_idx").on(t.placedAt),
    index("orders_origin_idx").on(t.originLocationId, t.status),
    check("orders_total_ck", sql`${t.subtotal} - ${t.discount} + ${t.delivery} = ${t.total}`),
    check(
      "orders_amounts_ck",
      sql`${t.subtotal} >= 0 and ${t.discount} >= 0 and ${t.discount} <= ${t.subtotal} and ${t.delivery} >= 0`,
    ),
    check("orders_vat_ck", sql`${t.vatComponent} >= 0 and ${t.vatComponent} <= ${t.total} and ${t.vatRateBp} >= 0`),
    check("orders_currency_ck", sql`${t.currency} = 'ILS'`),
  ],
);

/** §5.2 OrderLine. Name/SKU snapshots keep history readable after catalogue edits. Journaled. */
export const orderLines = pgTable(
  "order_lines",
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    sku: text().notNull(),
    productNameAr: text().notNull(),
    productNameEn: text().notNull(),
    variantNameAr: text(),
    variantNameEn: text(),
    quantity: integer().notNull(),
    shortfallQty: integer().notNull().default(0), // FR-INV-011; > 0 ⇒ order BACKORDERED
    unitPrice: money().notNull(), // agorot, VAT-inclusive
    discountAllocated: money().notNull().default(0), // share of order discount (largest remainder, src/lib/vat.ts)
    lineTotal: money().notNull(), // unit_price × quantity − discount_allocated
    lineVat: money().notNull(), // contained in line_total
    position: integer().notNull().default(0),
  },
  (t) => [
    index("order_lines_order_idx").on(t.orderId),
    index("order_lines_variant_idx").on(t.variantId),
    check("order_lines_qty_ck", sql`${t.quantity} > 0`),
    check("order_lines_shortfall_ck", sql`${t.shortfallQty} >= 0 and ${t.shortfallQty} <= ${t.quantity}`),
    check(
      "order_lines_amounts_ck",
      sql`${t.unitPrice} >= 0 and ${t.discountAllocated} >= 0 and ${t.lineTotal} >= 0 and ${t.lineVat} >= 0`,
    ),
  ],
);

export const orderMachineEnum = pgEnum("orders_machine", ["fulfilment", "payment"]);

/**
 * One row per state transition on either machine (FR-ORD-003, FR-PAY-013). Append-only (010-append-only.sql).
 * from_state is null for the initial state. actor_type: "staff" | "customer" | "system" | "provider".
 */
export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    machine: orderMachineEnum().notNull(),
    fromState: text(),
    toState: text().notNull(),
    trigger: text().notNull(),
    actorType: text().notNull().default("system"),
    actorId: uuid(),
    data: jsonb(),
    occurredAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.occurredAt)],
);

/** Staff-only notes (FR-ORD-010) — never selected by customer-facing code. */
export const orderNotes = pgTable(
  "order_notes",
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    authorId: uuid().references(() => staffUsers.id, { onDelete: "set null" }),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("order_notes_order_idx").on(t.orderId)],
);

/**
 * Idempotency ledger for mutating endpoints (FR-CRT-008 and provider webhooks). `scope` e.g. "checkout",
 * "webhook:payments"; `result` holds what to replay (e.g. `{ orderId }`).
 */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: id(),
    scope: text().notNull(),
    key: text().notNull(),
    requestHash: text(),
    result: jsonb(),
    createdAt: createdAt(),
    expiresAt: tstz(),
  },
  (t) => [uniqueIndex("idempotency_keys_scope_key_uq").on(t.scope, t.key)],
);

// ---------------------------------------------------------------------------------------------------------------
// Shipments, outcomes, returns (FR-ORD-005..017, FR-ORD-026)
// ---------------------------------------------------------------------------------------------------------------

export const shipmentStatusEnum = pgEnum("orders_shipment_status", [
  "pending",
  "dispatched",
  "delivered",
  "failed",
  "lost",
  "returned_to_origin",
]);

/** A consignment handed to the courier (FR-ORD-005/007). consignment_ref is internal (AS-10: no public tracking). */
export const shipments = pgTable(
  "shipments",
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    originLocationId: uuid()
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    consignmentRef: text(),
    courier: text(),
    status: shipmentStatusEnum().notNull().default("pending"),
    exportedAt: tstz(), // FR-ORD-008 CSV export
    dispatchedAt: tstz(),
    deliveredAt: tstz(),
    returnedAt: tstz(), // goods back at origin (FR-ORD-016)
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("shipments_order_idx").on(t.orderId), index("shipments_status_idx").on(t.status)],
);

export const shipmentLines = pgTable(
  "shipment_lines",
  {
    id: id(),
    shipmentId: uuid()
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    orderLineId: uuid()
      .notNull()
      .references(() => orderLines.id, { onDelete: "restrict" }),
    qty: integer().notNull(),
  },
  (t) => [
    uniqueIndex("shipment_lines_shipment_line_uq").on(t.shipmentId, t.orderLineId),
    check("shipment_lines_qty_ck", sql`${t.qty} > 0`),
  ],
);

export const deliveryOutcomeEnum = pgEnum("orders_delivery_outcome", ["delivered", "failed", "refused", "lost"]);
export const failedDeliveryDecisionEnum = pgEnum("orders_failed_delivery_decision", ["redeliver", "cancel"]);

/** Per-consignment outcome (FR-ORD-014..017, FR-ORD-026). reason is from a configurable list (settings). */
export const deliveryOutcomes = pgTable(
  "delivery_outcomes",
  {
    id: id(),
    shipmentId: uuid()
      .notNull()
      .references(() => shipments.id, { onDelete: "restrict" }),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    outcome: deliveryOutcomeEnum().notNull(),
    reason: text(),
    decision: failedDeliveryDecisionEnum(), // FR-ORD-017, recorded when the failure is resolved
    decidedAt: tstz(),
    recordedById: uuid().references(() => staffUsers.id, { onDelete: "set null" }),
    recordedAt: createdAt(),
  },
  (t) => [
    index("delivery_outcomes_shipment_idx").on(t.shipmentId),
    index("delivery_outcomes_order_idx").on(t.orderId),
    // FR-ORD-015: a failed/refused outcome must carry a reason
    check("delivery_outcomes_reason_ck", sql`${t.outcome} in ('delivered', 'lost') or ${t.reason} is not null`),
  ],
);

export const returnStatusEnum = pgEnum("orders_return_status", ["requested", "approved", "received", "rejected", "closed"]);
export const returnKindEnum = pgEnum("orders_return_kind", ["return", "exchange"]);

/** FR-ORD-009: stock is restored only on receipt (a `return` stock movement citing the return). */
export const returns = pgTable(
  "returns",
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    kind: returnKindEnum().notNull().default("return"),
    status: returnStatusEnum().notNull().default("requested"),
    reasonCode: text().notNull(),
    note: text(),
    receivedLocationId: uuid().references(() => locations.id, { onDelete: "restrict" }),
    requestedAt: tstz().notNull().defaultNow(),
    receivedAt: tstz(),
    handledById: uuid().references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("returns_order_idx").on(t.orderId)],
);

export const returnLines = pgTable(
  "return_lines",
  {
    id: id(),
    returnId: uuid()
      .notNull()
      .references(() => returns.id, { onDelete: "cascade" }),
    orderLineId: uuid()
      .notNull()
      .references(() => orderLines.id, { onDelete: "restrict" }),
    qty: integer().notNull(),
    restock: boolean().notNull().default(true), // false = damaged, written off
  },
  (t) => [
    uniqueIndex("return_lines_return_line_uq").on(t.returnId, t.orderLineId),
    check("return_lines_qty_ck", sql`${t.qty} > 0`),
  ],
);
