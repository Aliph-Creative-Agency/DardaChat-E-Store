/** Engagement contract DTOs (FR-MSG-001/002/004, FR-CRM-001, NFR-PRV-002). Phones are E.164, emails lower-case. */

export type Locale = "ar" | "en";
export type ContactChannel = "whatsapp" | "sms" | "email";

/** Transactional (non-marketing) events other modules may `notify` — no consent gate (FR-MSG-002). */
export const TRANSACTIONAL_EVENTS = [
  "order.confirmation",
  "payment.succeeded",
  "payment.failed",
  "order.dispatched",
  "order.delivered",
  "account.welcome",
  "account.password_reset",
  "account.email_changed",
] as const;
export type TransactionalEvent = (typeof TRANSACTIONAL_EVENTS)[number];

export interface NotifyRecipient {
  /** When only this is given, contact + locale come from the customer row. */
  customerId?: string;
  phone?: string;
  email?: string;
  locale?: Locale;
}

/** Event data used by the default texts. Unknown keys are kept in the message payload. */
export interface NotifyData {
  orderId?: string;
  /** Order reference, e.g. "DC-7K3M-Q9TX". */
  reference?: string;
  /** Agorot. */
  total?: number;
  name?: string;
  /** Tracking / order status link. */
  url?: string;
  /** account.password_reset: the reset link. */
  resetUrl?: string;
  /** account.email_changed: the new address (the notice goes to the old one too when given as recipient.email). */
  newEmail?: string;
  /** Overrides the dedupe reference (default `orderId`, else `customerId` for non-repeatable account events). */
  dedupeRef?: string;
  [key: string]: unknown;
}

export interface NotifyResult {
  /** One per send group (phone chain whatsapp→sms, then email); empty when there is no usable contact. */
  messageIds: string[];
}

export interface CustomerView {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  locale: Locale;
  status: "active" | "disabled" | "erased";
  isGuest: boolean;
  createdAt: Date;
}

export interface UpsertCustomerInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  locale: Locale;
  /** Only used when a new row is created. Default true (created without a password, e.g. at guest checkout). */
  isGuest?: boolean;
}

export interface UpsertCustomerResult {
  customer: CustomerView;
  created: boolean;
}

export interface AddressInput {
  /** Present = update that address (must belong to the customer). */
  id?: string;
  label?: string | null;
  recipientName: string;
  phone: string;
  /** English governorate key as in delivery_zones.governorate. */
  governorate: string;
  locality: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  notes?: string | null;
  isDefault?: boolean;
}

export interface AddressView {
  id: string;
  customerId: string;
  label: string | null;
  recipientName: string;
  phone: string;
  governorate: string;
  locality: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  notes: string | null;
  isDefault: boolean;
}

export type ConsentSource = "checkout" | "account" | "journey" | "admin" | "import";

export interface RecordConsentInput {
  customerId: string;
  /** Channel-scoped purposes are stored as `<purpose>_<channel>` (e.g. marketing_whatsapp); omit for terms/privacy. */
  channel?: ContactChannel | null;
  purpose: string;
  granted: boolean;
  source: ConsentSource;
  policyVersion?: string | null;
  evidence?: Record<string, unknown> | null;
}

export interface ConsentView {
  id: string;
  customerId: string;
  /** Stored purpose, e.g. "marketing_whatsapp", "terms". */
  purpose: string;
  granted: boolean;
  source: string;
  policyVersion: string | null;
  recordedAt: Date;
}
