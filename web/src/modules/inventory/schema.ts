import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, localeEnum, money, tstz, updatedAt } from "../../db/columns";
import { staffUsers } from "../auth/schema";
import { variants } from "../catalog/schema";
import { customers } from "../engagement/schema";

// ---------------------------------------------------------------------------------------------------------------
// Locations and stock (FR-INV-001..011, CON-09: online stock is an allocation; one writer)
// ---------------------------------------------------------------------------------------------------------------

export const locationKindEnum = pgEnum("inventory_location_kind", ["store_room", "household", "other"]);

/** Dispatch origins (AS-09): a store room and a household address. `is_origin` = may dispatch orders. */
export const locations = pgTable("locations", {
  id: id(),
  code: text().notNull().unique(), // e.g. "STORE", "HOME"
  nameAr: text().notNull(),
  nameEn: text().notNull(),
  kind: locationKindEnum().notNull(),
  isOrigin: boolean().notNull().default(true),
  governorate: text(), // for FR-ADR-009 origin assignment
  locality: text(),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Current quantities per variant × location (FR-INV-001/002). Available = on_hand − reserved (never stored).
 * Maintained by the inventory module in the same transaction as the stock_movements row that explains the change;
 * `sum(stock_movements.delta) = on_hand` per variant × location is an invariant.
 */
export const stockLevels = pgTable(
  "stock_levels",
  {
    id: id(),
    variantId: uuid()
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    locationId: uuid()
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    onHand: integer().notNull().default(0),
    reserved: integer().notNull().default(0),
    safetyThreshold: integer().notNull().default(0), // low-stock alert level
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("stock_levels_variant_location_uq").on(t.variantId, t.locationId),
    check("stock_levels_on_hand_ck", sql`${t.onHand} >= 0`),
    // FR-INV-005/011: never reserve stock we do not have.
    check("stock_levels_reserved_ck", sql`${t.reserved} >= 0 and ${t.reserved} <= ${t.onHand}`),
    check("stock_levels_threshold_ck", sql`${t.safetyThreshold} >= 0`),
  ],
);

export const stockMovementReasonEnum = pgEnum("inventory_movement_reason", [
  "sale_online",
  "purchase_receipt",
  "return",
  "adjustment",
  "transfer_in",
  "transfer_out",
  "loss_in_transit",
]);

/**
 * Immutable stock ledger (§5.2 StockMovement, FR-INV-003). Append-only (010-append-only.sql).
 * reference_type/reference_id: originating document, e.g. ("order", id), ("po_receipt", id), ("transfer", groupId),
 * ("adjustment", null). actor_type: "staff" | "customer" | "system".
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    variantId: uuid()
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    locationId: uuid()
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    delta: integer().notNull(),
    reason: stockMovementReasonEnum().notNull(),
    note: text(), // mandatory for adjustments (FR-INV-006) — enforced by the inventory module
    referenceType: text(),
    referenceId: uuid(),
    actorType: text().notNull().default("system"),
    actorId: uuid(),
    occurredAt: createdAt(),
  },
  (t) => [
    index("stock_movements_variant_location_idx").on(t.variantId, t.locationId, t.occurredAt),
    index("stock_movements_reference_idx").on(t.referenceType, t.referenceId),
    check("stock_movements_delta_ck", sql`${t.delta} <> 0`),
  ],
);

/**
 * Stock held for an order line (FR-INV-004/009/010/011). Active = released_at is null. expires_at is set for
 * PENDING prepaid orders (TTL from settings), null for COD/paid orders.
 * order_id has no FK here to keep module imports acyclic (orders → inventory); the orders module owns the pairing.
 */
export const reservations = pgTable(
  "reservations",
  {
    id: id(),
    orderId: uuid().notNull(),
    orderLineId: uuid(),
    variantId: uuid()
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    locationId: uuid()
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    qty: integer().notNull(),
    expiresAt: tstz(),
    releasedAt: tstz(),
    releaseReason: text(), // "dispatched" | "cancelled" | "expired" | "shortfall"
    createdAt: createdAt(),
  },
  (t) => [
    index("reservations_order_idx").on(t.orderId),
    index("reservations_active_expiry_idx").on(t.expiresAt).where(sql`${t.releasedAt} is null`),
    check("reservations_qty_ck", sql`${t.qty} > 0`),
  ],
);

/** FR-INV-008: transactional notification request (not a marketing consent). */
export const backInStockRequests = pgTable(
  "back_in_stock_requests",
  {
    id: id(),
    variantId: uuid()
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    customerId: uuid().references(() => customers.id, { onDelete: "cascade" }),
    email: text(),
    phoneE164: text(),
    channel: text().notNull(), // "whatsapp" | "sms" | "email"
    locale: localeEnum().notNull().default("ar"),
    notifiedAt: tstz(),
    cancelledAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    index("back_in_stock_open_idx").on(t.variantId).where(sql`${t.notifiedAt} is null and ${t.cancelledAt} is null`),
    check(
      "back_in_stock_contact_ck",
      sql`${t.customerId} is not null or ${t.email} is not null or ${t.phoneE164} is not null`,
    ),
  ],
);

// ---------------------------------------------------------------------------------------------------------------
// Purchasing (FR-PUR-001..004)
// ---------------------------------------------------------------------------------------------------------------

export const suppliers = pgTable("suppliers", {
  id: id(),
  name: text().notNull(),
  contactName: text(),
  phoneE164: text(),
  email: text(),
  address: text(),
  paymentTerms: text(), // free text, e.g. "50% on order, 50% on delivery"
  leadTimeDays: integer(),
  notes: text(),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** FR-PUR-002: draft → issued → partially_received → received; draft|issued → cancelled. */
export const purchaseOrderStatusEnum = pgEnum("inventory_po_status", [
  "draft",
  "issued",
  "partially_received",
  "received",
  "cancelled",
]);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: id(),
    code: text().notNull().unique(), // human reference, e.g. "PO-2026-001"
    supplierId: uuid()
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    status: purchaseOrderStatusEnum().notNull().default("draft"),
    destinationLocationId: uuid().references(() => locations.id, { onDelete: "restrict" }),
    expectedOn: date(),
    notes: text(),
    issuedAt: tstz(),
    cancelledAt: tstz(),
    createdById: uuid().references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("purchase_orders_supplier_idx").on(t.supplierId, t.status)],
);

export const poLines = pgTable(
  "po_lines",
  {
    id: id(),
    purchaseOrderId: uuid()
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    qtyOrdered: integer().notNull(),
    qtyReceived: integer().notNull().default(0), // denormalised sum of po_receipt_lines.qty
    expectedUnitCost: money(), // agorot, OWNER-ONLY
  },
  (t) => [
    uniqueIndex("po_lines_po_variant_uq").on(t.purchaseOrderId, t.variantId),
    check("po_lines_qty_ck", sql`${t.qtyOrdered} > 0 and ${t.qtyReceived} >= 0`),
  ],
);

/** A delivery from the supplier; each receipt line creates one `purchase_receipt` stock movement (FR-PUR-003). */
export const poReceipts = pgTable(
  "po_receipts",
  {
    id: id(),
    purchaseOrderId: uuid()
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "restrict" }),
    locationId: uuid()
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    receivedAt: tstz().notNull().defaultNow(),
    receivedById: uuid().references(() => staffUsers.id, { onDelete: "set null" }),
    notes: text(),
    meta: jsonb(),
  },
  (t) => [index("po_receipts_po_idx").on(t.purchaseOrderId)],
);

export const poReceiptLines = pgTable(
  "po_receipt_lines",
  {
    id: id(),
    receiptId: uuid()
      .notNull()
      .references(() => poReceipts.id, { onDelete: "restrict" }),
    poLineId: uuid()
      .notNull()
      .references(() => poLines.id, { onDelete: "restrict" }),
    qty: integer().notNull(),
    unitCost: money(), // agorot, landed (incl. delivery/handling) — FR-PUR-004, OWNER-ONLY
  },
  (t) => [
    index("po_receipt_lines_receipt_idx").on(t.receiptId),
    check("po_receipt_lines_qty_ck", sql`${t.qty} > 0`),
    check("po_receipt_lines_cost_ck", sql`${t.unitCost} is null or ${t.unitCost} >= 0`),
  ],
);
