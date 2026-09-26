/**
 * Order state machines — SRS Appendix A, transcribed row by row. Pure data + pure checks: no DB, no side effects.
 * Two independent machines (FR-PAY-013): fulfilment (A.1/A.2) and payment (A.3/A.4). Every transition must write an
 * OrderEvent (FR-ORD-003) — that is the ORDERS service's job; `sideEffects` here only documents what it must do.
 *
 * Rows flagged `splitShipment` depend on FR-ORD-005 (partial fulfilment), which is item 6 of the SRS §1.6 descope
 * order. They are permitted (the appendix lists them) until that item is withdrawn.
 */

export const FULFILMENT_STATES = [
  "PENDING",
  "PAID",
  "COD_CONFIRMED",
  "PAYMENT_FAILED",
  "PROCESSING",
  "BACKORDERED",
  "PARTIALLY_DISPATCHED",
  "DISPATCHED",
  "DELIVERED",
  "DELIVERY_FAILED",
  "LOST_IN_TRANSIT",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "COMPLETED",
] as const;
export type FulfilmentState = (typeof FULFILMENT_STATES)[number];

export const PAYMENT_STATES = [
  "UNPAID",
  "AUTHORISED",
  "PAID",
  "COD_DUE",
  "COD_SETTLED",
  "COD_CANCELLED",
  "PART_REFUNDED",
  "REFUNDED",
  "WRITTEN_OFF",
] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export type Machine = "fulfilment" | "payment";
export type StateOf<M extends Machine> = M extends "fulfilment" ? FulfilmentState : PaymentState;

export interface Transition<S extends string> {
  from: S;
  to: S;
  /** Stable machine-readable trigger key (use it in OrderEvent.trigger). */
  trigger: string;
  /** SRS wording of the trigger. */
  description: string;
  sideEffects: readonly string[];
  splitShipment?: true;
}

/** Appendix A.2 — 30 rows. */
export const FULFILMENT_TRANSITIONS: readonly Transition<FulfilmentState>[] = [
  { from: "PENDING", to: "PAID", trigger: "payment_authorised", description: "Provider notification confirms authorisation (FR-PAY-005)", sideEffects: ["payment_state → PAID", "confirmation message sent"] },
  { from: "PENDING", to: "COD_CONFIRMED", trigger: "cod_accepted", description: "COD order accepted; zone and value limits satisfied (FR-PAY-001)", sideEffects: ["payment_state → COD_DUE", "confirmation message sent"] },
  { from: "PENDING", to: "PAYMENT_FAILED", trigger: "payment_failed", description: "Authorisation declined or expired", sideEffects: ["reservation released", "cart preserved for retry (FR-PAY-007)"] },
  { from: "PENDING", to: "CANCELLED", trigger: "cancelled_before_payment", description: "Customer or staff cancellation before payment resolves", sideEffects: ["reservation released"] },
  { from: "PENDING", to: "CANCELLED", trigger: "reservation_expired", description: "Reservation time-to-live expired without payment (FR-INV-009)", sideEffects: ["reservation released", "customer notified that the order lapsed"] },
  { from: "PAYMENT_FAILED", to: "PENDING", trigger: "payment_retry", description: "Customer retries payment, and the reservation is re-acquired (FR-INV-010)", sideEffects: ["stock reserved again; if unavailable the retry is refused and the order stays PAYMENT_FAILED"] },
  { from: "PAID", to: "PROCESSING", trigger: "released_to_warehouse", description: "Released to the warehouse", sideEffects: [] },
  { from: "COD_CONFIRMED", to: "PROCESSING", trigger: "released_to_warehouse", description: "Released to the warehouse", sideEffects: [] },
  { from: "PAID", to: "CANCELLED", trigger: "cancelled_after_payment", description: "Cancellation after payment, before picking (FR-ORD-011)", sideEffects: ["reservation released", "refund raised in the payment model (A.4)"] },
  { from: "COD_CONFIRMED", to: "CANCELLED", trigger: "cancelled_after_acceptance", description: "Cancellation after acceptance, before picking (FR-ORD-011)", sideEffects: ["reservation released", "payment_state → COD_CANCELLED, no money moves"] },
  { from: "PROCESSING", to: "PARTIALLY_DISPATCHED", trigger: "partial_dispatch", description: "Some lines dispatched", sideEffects: ["consignment reference recorded", "invoice issued where prepaid, first dispatch (FR-ORD-023)"], splitShipment: true },
  { from: "PROCESSING", to: "DISPATCHED", trigger: "dispatched", description: "All lines dispatched", sideEffects: ["consignment reference recorded", "dispatch message sent", "invoice issued where prepaid (FR-ORD-023)"] },
  { from: "PARTIALLY_DISPATCHED", to: "DISPATCHED", trigger: "remaining_dispatched", description: "Remaining lines dispatched", sideEffects: ["second consignment recorded", "no second invoice (FR-ORD-023)"], splitShipment: true },
  { from: "PROCESSING", to: "BACKORDERED", trigger: "shortfall_found", description: "Shortfall found at picking (FR-ORD-021)", sideEffects: ["shortfall recorded on the line", "customer told a revised expectation"] },
  { from: "BACKORDERED", to: "PROCESSING", trigger: "shortfall_cleared", description: "Stock received or adjusted in, clearing the shortfall (FR-ORD-022)", sideEffects: ["reservation restored in full", "customer notified that fulfilment has resumed"] },
  { from: "BACKORDERED", to: "CANCELLED", trigger: "cancelled_while_backordered", description: "Customer chooses to cancel while waiting", sideEffects: ["reservation released", "refund raised in the payment model where prepaid"] },
  { from: "PROCESSING", to: "CANCELLED", trigger: "cancelled_before_dispatch", description: "Cancellation before dispatch (FR-ORD-011)", sideEffects: ["reservation released", "refund raised in the payment model where prepaid"] },
  { from: "DISPATCHED", to: "DELIVERED", trigger: "delivered", description: "Courier outcome recorded as delivered (FR-ORD-026)", sideEffects: ["COD reconciliation becomes due (FR-PAY-008)", "invoice issued where COD (FR-ORD-023)"] },
  { from: "PARTIALLY_DISPATCHED", to: "DELIVERED", trigger: "delivered", description: "Courier outcome recorded as delivered for every dispatched consignment", sideEffects: ["as DISPATCHED→DELIVERED for the dispatched lines", "COD invoice issued on the first such delivery only"], splitShipment: true },
  { from: "DISPATCHED", to: "DELIVERY_FAILED", trigger: "delivery_failed", description: "Delivery attempts exhausted, or parcel refused (FR-ORD-014)", sideEffects: ["reason recorded (FR-ORD-015)"] },
  { from: "PARTIALLY_DISPATCHED", to: "DELIVERY_FAILED", trigger: "delivery_failed", description: "A dispatched consignment fails and no further lines are outstanding", sideEffects: ["reason recorded for the affected consignment"], splitShipment: true },
  { from: "DISPATCHED", to: "LOST_IN_TRANSIT", trigger: "lost_in_transit", description: "No outcome within the ageing threshold; consignment written off (FR-ORD-027)", sideEffects: ["stock written off", "refund raised where prepaid"] },
  { from: "DELIVERY_FAILED", to: "LOST_IN_TRANSIT", trigger: "lost_in_transit", description: "Goods never arrive back at the origin within the ageing threshold", sideEffects: ["stock written off", "refund raised where prepaid"] },
  { from: "DELIVERY_FAILED", to: "PROCESSING", trigger: "redelivery_agreed", description: "Redelivery agreed with the customer (FR-ORD-017)", sideEffects: ["stock reserved again on receipt back at origin"] },
  { from: "DELIVERY_FAILED", to: "CANCELLED", trigger: "redelivery_declined", description: "Redelivery declined or abandoned (FR-ORD-017)", sideEffects: ["stock restored on receipt back at origin (FR-ORD-016)", "refund raised where prepaid"] },
  { from: "DELIVERED", to: "RETURN_REQUESTED", trigger: "return_requested", description: "Customer requests a return within the policy window", sideEffects: [] },
  { from: "DELIVERED", to: "COMPLETED", trigger: "return_window_elapsed", description: "Return window elapsed and no further money is expected (guard: completionAllowed)", sideEffects: [] },
  { from: "RETURN_REQUESTED", to: "RETURNED", trigger: "return_received", description: "Returned goods received and inspected (FR-ORD-009)", sideEffects: ["stock restored", "refund raised in the payment model (FR-PAY-006)"] },
  { from: "RETURNED", to: "COMPLETED", trigger: "return_settled", description: "Goods returned and no further money is expected", sideEffects: ["credit note issued and submitted where an invoice was issued (FR-ORD-020)"] },
  { from: "RETURN_REQUESTED", to: "COMPLETED", trigger: "return_withdrawn", description: "Return request withdrawn or lapsed", sideEffects: [] },
];

/** Appendix A.4 — 14 rows. */
export const PAYMENT_TRANSITIONS: readonly Transition<PaymentState>[] = [
  { from: "UNPAID", to: "AUTHORISED", trigger: "authorised", description: "Provider authorises without capture", sideEffects: ["authorisation reference recorded (FR-PAY-004)"] },
  { from: "UNPAID", to: "PAID", trigger: "captured", description: "Provider notification confirms capture (FR-PAY-005)", sideEffects: ["invoice becomes issuable on dispatch (FR-ORD-023)"] },
  { from: "AUTHORISED", to: "PAID", trigger: "captured", description: "Capture confirmed", sideEffects: ["invoice becomes issuable on dispatch (FR-ORD-023)"] },
  { from: "AUTHORISED", to: "UNPAID", trigger: "authorisation_voided", description: "Authorisation expired or voided before capture", sideEffects: ["order returns to PAYMENT_FAILED or CANCELLED in the fulfilment model"] },
  { from: "UNPAID", to: "COD_DUE", trigger: "cod_accepted", description: "COD order accepted (FR-PAY-001)", sideEffects: ["order appears on the COD outstanding list"] },
  { from: "COD_DUE", to: "COD_SETTLED", trigger: "remittance_allocated", description: "Remittance received and allocated to this order (FR-PAY-016)", sideEffects: ["order becomes eligible for COMPLETED"] },
  { from: "COD_DUE", to: "COD_CANCELLED", trigger: "cancelled_before_delivery", description: "Order cancelled before delivery", sideEffects: ["removed from the COD outstanding list", "no credit note (no invoice was issued)"] },
  { from: "COD_DUE", to: "WRITTEN_OFF", trigger: "written_off", description: "Cash judged uncollectable, recorded by an Owner with a reason", sideEffects: ["credit note issued against the invoice where one was issued (FR-ORD-020)"] },
  { from: "PAID", to: "PART_REFUNDED", trigger: "partial_refund", description: "Partial refund executed (FR-PAY-006)", sideEffects: ["credit note for the refunded amount (FR-ORD-020)"] },
  { from: "PAID", to: "REFUNDED", trigger: "full_refund", description: "Full refund executed (FR-PAY-006)", sideEffects: ["credit note for the full amount (FR-ORD-020)"] },
  { from: "PART_REFUNDED", to: "PART_REFUNDED", trigger: "partial_refund", description: "A further partial refund, cumulative total still below the amount paid", sideEffects: ["further credit note", "cumulative refunds may never exceed the amount paid"] },
  { from: "PART_REFUNDED", to: "REFUNDED", trigger: "full_refund", description: "Cumulative refunds reach the amount paid", sideEffects: ["final credit note"] },
  { from: "COD_SETTLED", to: "PART_REFUNDED", trigger: "cash_refund_partial", description: "Cash returned to the customer in part (FR-PAY-014)", sideEffects: ["credit note", "refund method and receiving party recorded"] },
  { from: "COD_SETTLED", to: "REFUNDED", trigger: "cash_refund_full", description: "Cash returned to the customer in full (FR-PAY-014)", sideEffects: ["credit note", "refund method and receiving party recorded"] },
];

export const FULFILMENT_TERMINAL: ReadonlySet<FulfilmentState> = new Set(["LOST_IN_TRANSIT", "CANCELLED", "COMPLETED"]);
export const PAYMENT_TERMINAL: ReadonlySet<PaymentState> = new Set(["COD_CANCELLED", "REFUNDED", "WRITTEN_OFF"]);

/** DELIVERED → COMPLETED guard (A.2): "no further money is expected". */
export const COMPLETION_PAYMENT_STATES: ReadonlySet<PaymentState> = new Set([
  "PAID",
  "COD_SETTLED",
  "PART_REFUNDED",
  "REFUNDED",
  "COD_CANCELLED",
  "WRITTEN_OFF",
]);

export function completionAllowed(paymentState: PaymentState): boolean {
  return COMPLETION_PAYMENT_STATES.has(paymentState);
}

function table<M extends Machine>(machine: M): readonly Transition<StateOf<M>>[] {
  return (machine === "fulfilment" ? FULFILMENT_TRANSITIONS : PAYMENT_TRANSITIONS) as readonly Transition<StateOf<M>>[];
}

export function isFulfilmentState(value: string): value is FulfilmentState {
  return (FULFILMENT_STATES as readonly string[]).includes(value);
}

export function isPaymentState(value: string): value is PaymentState {
  return (PAYMENT_STATES as readonly string[]).includes(value);
}

/** The transition rows leaving `from`. */
export function allowedTransitions<M extends Machine>(machine: M, from: StateOf<M>): Transition<StateOf<M>>[] {
  return table(machine).filter((t) => t.from === from);
}

/** Find the matching row; with `trigger`, the trigger must match too. */
export function findTransition<M extends Machine>(
  machine: M,
  from: StateOf<M>,
  to: StateOf<M>,
  trigger?: string,
): Transition<StateOf<M>> | undefined {
  return table(machine).find((t) => t.from === from && t.to === to && (trigger === undefined || t.trigger === trigger));
}

export function canTransition<M extends Machine>(machine: M, from: StateOf<M>, to: StateOf<M>, trigger?: string): boolean {
  return findTransition(machine, from, to, trigger) !== undefined;
}

export class TransitionError extends Error {
  constructor(
    readonly machine: Machine,
    readonly from: string,
    readonly to: string,
    readonly trigger: string | undefined,
    readonly reason: "not_permitted" | "completion_guard",
  ) {
    super(
      reason === "completion_guard"
        ? `${machine}: ${from} → ${to} refused: payment state does not allow completion`
        : `${machine}: ${from} → ${to}${trigger ? ` (${trigger})` : ""} is not a permitted transition`,
    );
    this.name = "TransitionError";
  }
}

/**
 * Throws `TransitionError` unless the row exists. For fulfilment DELIVERED → COMPLETED pass `paymentState` so the
 * A.2 guard is enforced.
 */
export function assertTransition<M extends Machine>(
  machine: M,
  from: StateOf<M>,
  to: StateOf<M>,
  opts: { trigger?: string; paymentState?: PaymentState } = {},
): Transition<StateOf<M>> {
  const row = findTransition(machine, from, to, opts.trigger);
  if (!row) throw new TransitionError(machine, from, to, opts.trigger, "not_permitted");
  if (machine === "fulfilment" && from === "DELIVERED" && to === "COMPLETED") {
    if (!opts.paymentState || !completionAllowed(opts.paymentState)) {
      throw new TransitionError(machine, from, to, opts.trigger, "completion_guard");
    }
  }
  return row;
}
