/** Payments contract DTOs (FR-PAY-001..016, CI-002, FR-CUR-*). Money = integer agorot, VAT contained (FR-CRT-007). */
import type { OrderTotals } from "../../lib/vat";

export type PaymentMethod = "card" | "wallet" | "instant_transfer" | "cod";
export type PaymentKind = "authorisation" | "capture" | "cash" | "void";
export type PaymentStatus = "pending" | "succeeded" | "failed";

export interface TotalsLineInput {
  /** Agorot, VAT-inclusive. */
  unitPrice: number;
  qty: number;
  /** Per-line rate override in bp; omitted = the active standard rate. Mixed rates are not supported yet. */
  vatRateBp?: number | null;
}

export interface ComputeTotalsInput {
  lines: TotalsLineInput[];
  /** Order-level discount, agorot (allocated to lines proportionally). */
  discount?: number;
  /** Delivery fee, agorot, VAT-inclusive at the goods rate. */
  deliveryFee: number;
  /** Rate lookup instant (default ctx.now / now). */
  at?: Date;
}

/** Same shape as `computeOrderTotals` in `@/lib/vat`: subtotal, discount, delivery, total, vat ("of which"), lines. */
export type Totals = OrderTotals;

export interface InitiatePaymentInput {
  orderId: string;
  method: PaymentMethod;
  /** Where the provider sends the customer back (absolute or app-relative). */
  returnUrl: string;
  locale: "ar" | "en";
}

export interface InitiatePaymentResult {
  paymentId: string;
  /** Hosted payment page to redirect to; null for cash on delivery. */
  redirectUrl: string | null;
}

export interface WebhookResult {
  /** False when the signature is invalid (respond 401) — nothing is processed. */
  accepted: boolean;
  /** True when this provider event was already recorded (respond 200, do nothing). */
  duplicate: boolean;
}

export interface RefundInput {
  orderId: string;
  /** Agorot. */
  amount: number;
  method: PaymentMethod | "cash";
  reason: string;
}

export interface PaymentEventView {
  id: string;
  kind: PaymentKind;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: string;
  amount: number;
  failureCode: string | null;
  occurredAt: Date;
}

export interface PaymentSummary {
  orderId: string;
  /** Σ succeeded capture + cash rows, agorot. */
  paidAmount: number;
  /** Status of the newest payment row, or null when there is none. */
  lastStatus: PaymentStatus | null;
  events: PaymentEventView[];
}
