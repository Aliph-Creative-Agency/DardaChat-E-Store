/** Orders contract DTOs (FR-ORD-001..005/012, FR-CRT-008, FR-ADR-006..009, Appendix A). Money = integer agorot. */
import type { BusinessDate } from "../../lib/time";
import type { FulfilmentState, Machine, PaymentState } from "./state-machine";

export type Locale = "ar" | "en";
export type OrderPaymentMethod = "card" | "wallet" | "instant_transfer" | "cod";

export interface PlaceOrderLineInput {
  variantId: string;
  qty: number;
}

export interface PlaceOrderInput {
  /** Signed-in customer; omitted = guest order (orders.customer_id null). */
  customerId?: string | null;
  contact: { name: string; phone: string; email?: string | null };
  locale: Locale;
  lines: PlaceOrderLineInput[];
  address: {
    zoneId: string;
    /** Town / village / camp (addresses.locality). */
    city: string;
    line1: string;
    line2?: string | null;
    landmark?: string | null;
    notes?: string | null;
    /** Defaults to contact.name / contact.phone. */
    recipientName?: string | null;
    recipientPhone?: string | null;
  };
  paymentMethod: OrderPaymentMethod;
  /** FR-CRT-008: the same key again returns the same order instead of placing a second one. */
  idempotencyKey: string;
  customerNote?: string | null;
}

export interface OrderAddressSnapshot {
  recipientName: string;
  phoneE164: string;
  governorate: string;
  locality: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  notes?: string | null;
}

export interface OrderLineView {
  id: string;
  variantId: string;
  sku: string;
  productNameAr: string;
  productNameEn: string;
  variantNameAr: string | null;
  variantNameEn: string | null;
  qty: number;
  shortfallQty: number;
  unitPrice: number;
  discountAllocated: number;
  lineTotal: number;
  lineVat: number;
}

export interface OrderTotalsView {
  subtotal: number;
  discount: number;
  delivery: number;
  /** subtotal − discount + delivery; VAT is contained in it (FR-CRT-007). */
  total: number;
  vat: number;
  vatRateBp: number;
}

export interface OrderView {
  id: string;
  reference: string;
  customerId: string | null;
  fulfilmentState: FulfilmentState;
  paymentState: PaymentState;
  paymentMethod: OrderPaymentMethod;
  locale: Locale;
  contact: { name: string; phone: string; email: string | null };
  totals: OrderTotalsView;
  lines: OrderLineView[];
  address: OrderAddressSnapshot;
  zone: { id: string; nameAr: string; nameEn: string };
  originLocationId: string;
  customerNote: string | null;
  placedAt: Date;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export interface PlaceOrderResult {
  order: OrderView;
  /** True when the idempotency key had already been used: nothing new was written. */
  replayed: boolean;
}

export interface OrderSummary {
  id: string;
  reference: string;
  fulfilmentState: FulfilmentState;
  paymentState: PaymentState;
  total: number;
  itemCount: number;
  placedAt: Date;
}

export interface TransitionInput {
  machine: Machine;
  /** Target state of that machine (Appendix A). */
  to: FulfilmentState | PaymentState;
  /** Appendix A trigger key; required when several rows share from→to. */
  trigger?: string;
  /** Stored on the order_events row. */
  data?: Record<string, unknown>;
}

export interface TransitionResult {
  orderId: string;
  machine: Machine;
  from: string;
  to: string;
  trigger: string;
  eventId: string;
}

export interface DeliveryZoneView {
  id: string;
  governorate: string;
  locality: string | null;
  nameAr: string;
  nameEn: string;
  /** Agorot, VAT-inclusive. */
  flatRate: number;
  codEligible: boolean;
  codMaxTotal: number | null;
  estMinDays: number;
  estMaxDays: number;
  isActive: boolean;
}

export interface DeliveryEstimate {
  zoneId: string;
  minDays: number;
  maxDays: number;
  /** Business dates (Asia/Jerusalem), counting delivery days only (Fridays skipped). */
  earliest: BusinessDate;
  latest: BusinessDate;
}
