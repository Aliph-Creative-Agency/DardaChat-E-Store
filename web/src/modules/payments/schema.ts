import { sql } from "drizzle-orm";
import { check, date, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, localeEnum, money, tstz, updatedAt } from "../../db/columns";
import { staffUsers } from "../auth/schema";
import { orders, paymentMethodEnum } from "../orders/schema";

// ---------------------------------------------------------------------------------------------------------------
// VAT (FR-CUR-006, FR-CRT-007/009)
// ---------------------------------------------------------------------------------------------------------------

/** Rate in force on a business date = row with the greatest effective_from <= that date. 1600 bp = 16%. */
export const vatRates = pgTable(
  "vat_rates",
  {
    id: id(),
    rateBp: integer().notNull(),
    effectiveFrom: date().notNull().unique("vat_rates_effective_from_unique"),
    createdAt: createdAt(),
  },
  (t) => [check("vat_rates_rate_ck", sql`${t.rateBp} >= 0 and ${t.rateBp} <= 10000`)],
);

// ---------------------------------------------------------------------------------------------------------------
// Payments and refunds (FR-PAY-*)
// ---------------------------------------------------------------------------------------------------------------

export const paymentKindEnum = pgEnum("payments_payment_kind", ["authorisation", "capture", "cash", "void"]);
export const paymentStatusEnum = pgEnum("payments_payment_status", ["pending", "succeeded", "failed"]);

/**
 * Money-movement ledger per order (append-only, 010-append-only.sql): one row per provider event or cash receipt.
 * A status change is a NEW row, never an update. `raw` = provider payload (secrets stripped).
 */
export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    method: paymentMethodEnum().notNull(),
    provider: text().notNull(), // "mock", "<psp>", "cash"
    providerRef: text(),
    kind: paymentKindEnum().notNull(),
    status: paymentStatusEnum().notNull(),
    amount: money().notNull(), // agorot
    failureCode: text(),
    raw: jsonb(),
    occurredAt: createdAt(),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId, t.occurredAt),
    // provider webhook de-duplication
    uniqueIndex("payments_provider_event_uq")
      .on(t.provider, t.providerRef, t.kind, t.status)
      .where(sql`${t.providerRef} is not null`),
    check("payments_amount_ck", sql`${t.amount} >= 0`),
  ],
);

export const refundMethodEnum = pgEnum("payments_refund_method", ["original_method", "cash", "bank_transfer", "wallet"]);
export const refundStatusEnum = pgEnum("payments_refund_status", ["pending", "succeeded", "failed", "cancelled"]);

/** FR-PAY-011..015. receiving_party: who gets the money (customer name / IBAN holder), required for manual methods. */
export const refunds = pgTable(
  "refunds",
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    paymentId: uuid().references(() => payments.id, { onDelete: "restrict" }),
    method: refundMethodEnum().notNull(),
    receivingParty: text(),
    amount: money().notNull(),
    reason: text(),
    providerRef: text(),
    status: refundStatusEnum().notNull().default("pending"),
    requestedById: uuid().references(() => staffUsers.id, { onDelete: "set null" }),
    completedAt: tstz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("refunds_order_idx").on(t.orderId), check("refunds_amount_ck", sql`${t.amount} > 0`)],
);

// ---------------------------------------------------------------------------------------------------------------
// Invoicing (FR-ORD-018..020/023/024, §5.2 Invoice / CreditNote)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Gapless series (FR-ORD-024). Allocate ONLY via `select next_series_number('invoice')` (030-number-series.sql)
 * inside the transaction that inserts the document — a rollback returns the number, so the series stays gapless.
 */
export const numberSeries = pgTable("number_series", {
  key: text().primaryKey(), // "invoice" | "credit_note"
  prefix: text().notNull(), // e.g. "INV-", "CN-"
  padTo: integer().notNull().default(6),
  nextValue: integer().notNull().default(1),
  updatedAt: updatedAt(),
});

export const clearanceStatusEnum = pgEnum("payments_clearance_status", [
  "not_submitted",
  "submitted",
  "cleared",
  "rejected",
]);

/** §5.2 Invoice. Append-only except the e-invoice fields (010-append-only.sql allows only those to change). */
export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    number: text().notNull().unique(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    issuedAt: tstz().notNull().defaultNow(), // dispatch (prepaid) or delivery (COD) — FR-ORD-023
    net: money().notNull(),
    vat: money().notNull(), // contained in gross
    gross: money().notNull(), // amount charged
    vatRateBp: integer().notNull(),
    locale: localeEnum().notNull().default("ar"),
    /** Buyer + seller snapshot for rendering the PDF (FR-ORD-006). */
    snapshot: jsonb().notNull(),
    submissionReference: text(),
    clearanceStatus: clearanceStatusEnum().notNull().default("not_submitted"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("invoices_order_uq").on(t.orderId), // one invoice per order in v1
    check("invoices_amounts_ck", sql`${t.net} + ${t.vat} = ${t.gross} and ${t.vat} >= 0 and ${t.gross} >= 0`),
  ],
);

export const creditNoteReasonEnum = pgEnum("payments_credit_note_reason", ["refund", "return", "write_off", "correction"]);

/**
 * §5.2 CreditNote. Σ amount per invoice ≤ invoice.gross — enforced by the payments module under a row lock on the
 * invoice. Append-only except the e-invoice fields.
 */
export const creditNotes = pgTable(
  "credit_notes",
  {
    id: id(),
    number: text().notNull().unique(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    refundId: uuid().references(() => refunds.id, { onDelete: "restrict" }),
    amount: money().notNull(),
    vat: money().notNull(), // contained in amount
    reason: creditNoteReasonEnum().notNull(),
    issuedAt: tstz().notNull().defaultNow(),
    submissionReference: text(),
    clearanceStatus: clearanceStatusEnum().notNull().default("not_submitted"),
    createdAt: createdAt(),
  },
  (t) => [
    index("credit_notes_invoice_idx").on(t.invoiceId),
    check("credit_notes_amount_ck", sql`${t.amount} > 0 and ${t.vat} >= 0 and ${t.vat} <= ${t.amount}`),
  ],
);

export const einvoiceDocumentTypeEnum = pgEnum("payments_einvoice_document_type", ["invoice", "credit_note"]);
export const einvoiceSubmissionStatusEnum = pgEnum("payments_einvoice_submission_status", [
  "pending",
  "accepted",
  "rejected",
  "error",
]);

/** Every attempt to clear a document with the tax authority (FR-ORD-018..020); provider is mocked until OI settled. */
export const einvoiceSubmissions = pgTable(
  "einvoice_submissions",
  {
    id: id(),
    documentType: einvoiceDocumentTypeEnum().notNull(),
    documentId: uuid().notNull(),
    attempt: integer().notNull().default(1),
    status: einvoiceSubmissionStatusEnum().notNull().default("pending"),
    request: jsonb(),
    response: jsonb(),
    submittedAt: tstz().notNull().defaultNow(),
    respondedAt: tstz(),
  },
  (t) => [
    uniqueIndex("einvoice_submissions_attempt_uq").on(t.documentType, t.documentId, t.attempt),
    check("einvoice_submissions_attempt_ck", sql`${t.attempt} >= 1`),
  ],
);

// ---------------------------------------------------------------------------------------------------------------
// COD cash (FR-PAY-010, FR-PAY-016, §5.2 CashRemittance / RemittanceAllocation)
// ---------------------------------------------------------------------------------------------------------------

/**
 * A lump sum handed over by the courier. Append-only. unallocated balance is DERIVED:
 * amount − Σ remittance_allocations.amount (never stored).
 */
export const cashRemittances = pgTable(
  "cash_remittances",
  {
    id: id(),
    amount: money().notNull(),
    receivedAt: tstz().notNull(),
    remittingParty: text().notNull(),
    receivedByUserId: uuid()
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [index("cash_remittances_received_idx").on(t.receivedAt), check("cash_remittances_amount_ck", sql`${t.amount} > 0`)],
);

/** Split of a remittance across COD orders. Append-only; over-allocation is refused by the payments module. */
export const remittanceAllocations = pgTable(
  "remittance_allocations",
  {
    id: id(),
    remittanceId: uuid()
      .notNull()
      .references(() => cashRemittances.id, { onDelete: "restrict" }),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    amount: money().notNull(),
    allocatedById: uuid().references(() => staffUsers.id, { onDelete: "restrict" }),
    allocatedAt: createdAt(),
  },
  (t) => [
    index("remittance_allocations_remittance_idx").on(t.remittanceId),
    index("remittance_allocations_order_idx").on(t.orderId),
    check("remittance_allocations_amount_ck", sql`${t.amount} > 0`),
  ],
);
