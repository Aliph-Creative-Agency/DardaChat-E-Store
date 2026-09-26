/**
 * Payments contract implementation (Phase 0, PLATFORM). Real: VAT rate lookup, totals (wrapping `@/lib/vat`),
 * webhook signature verification, payment summary read. STUB(contracts): the PSP flow, refunds, invoices — the
 * payments team builds them behind these signatures (provider-neutral + mock PSP, CI-002).
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import { dbOf, nowOf, type ServiceContext } from "../../lib/context";
import { AppError, NotImplementedError } from "../../lib/errors";
import { agorot } from "../../lib/money";
import { stubWarn } from "../../lib/stub";
import { businessDate } from "../../lib/time";
import { computeOrderTotals, VatError } from "../../lib/vat";
import { payments, vatRates } from "./schema";
import type {
  ComputeTotalsInput,
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentSummary,
  RefundInput,
  Totals,
  WebhookResult,
} from "./types";

/** Standard VAT rate in bp in force on the business date (Asia/Jerusalem) of `at` (default now). */
export async function getActiveVatRate(at?: Date, ctx?: ServiceContext): Promise<number> {
  const day = businessDate(at ?? nowOf(ctx));
  const [row] = await dbOf(ctx)
    .select({ rateBp: vatRates.rateBp })
    .from(vatRates)
    .where(lte(vatRates.effectiveFrom, day))
    .orderBy(desc(vatRates.effectiveFrom))
    .limit(1);
  if (!row) throw new AppError("not_found", `no VAT rate in force on ${day}`);
  return row.rateBp;
}

/** FR-CRT-007/009 totals: VAT contained in the total (never added), discount allocated, one rounding at order level. */
export async function computeTotals(input: ComputeTotalsInput, ctx?: ServiceContext): Promise<Totals> {
  const standard = await getActiveVatRate(input.at, ctx);
  const rates = new Set(input.lines.map((l) => l.vatRateBp ?? standard));
  if (rates.size > 1) throw new AppError("invalid_input", "mixed VAT rates in one order are not supported", { rates: [...rates] });
  const rateBp = rates.values().next().value ?? standard;
  try {
    return computeOrderTotals({
      lines: input.lines.map((l) => ({ unitPrice: agorot(l.unitPrice), quantity: l.qty })),
      discount: agorot(input.discount ?? 0),
      delivery: agorot(input.deliveryFee),
      rateBp,
    });
  } catch (error) {
    if (error instanceof VatError || (error instanceof Error && error.name === "MoneyError")) {
      throw new AppError("invalid_input", error.message);
    }
    throw error;
  }
}

/**
 * HMAC-SHA256 of the raw body with `PAYMENT_WEBHOOK_SECRET`, hex, optionally prefixed `sha256=`. Timing-safe.
 * False when the secret is not configured.
 */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string | null | undefined): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const given = signature.trim().replace(/^sha256=/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(given)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(given, "hex"));
}

/** Start a payment for an order: returns where to send the customer (null for COD). */
export async function initiatePayment(input: InitiatePaymentInput, ctx?: ServiceContext): Promise<InitiatePaymentResult> {
  // STUB(contracts): payments team creates the pending `payments` row, calls the PSP adapter through
  // callExternal({ service: "payments" }) and returns the hosted page URL; builds the mock PSP page.
  stubWarn("payments.initiatePayment");
  void ctx;
  const paymentId = randomUUID();
  if (input.method === "cod") return { paymentId, redirectUrl: null };
  const q = new URLSearchParams({ order: input.orderId, payment: paymentId, return: input.returnUrl });
  return { paymentId, redirectUrl: `/${input.locale}/checkout/mock-pay?${q.toString()}` };
}

/** Provider webhook entry point (route handler passes the raw body + signature header). */
export async function handleProviderWebhook(
  rawBody: string | Buffer,
  signature: string | null | undefined,
  ctx?: ServiceContext,
): Promise<WebhookResult> {
  if (!verifyWebhookSignature(rawBody, signature)) return { accepted: false, duplicate: false };
  // STUB(contracts): payments team parses the event, appends a `payments` row (dedupe on
  // payments_provider_event_uq → duplicate: true), transitions the order's payment machine, notifies.
  stubWarn("payments.handleProviderWebhook");
  void ctx;
  return { accepted: true, duplicate: false };
}

export async function refund(input: RefundInput, ctx: ServiceContext): Promise<never> {
  // STUB(contracts): payments team implements FR-PAY refunds (PSP refund / cash refund record + credit note).
  stubWarn("payments.refund");
  void input;
  void ctx;
  throw new NotImplementedError("payments.refund");
}

/** Issue the tax invoice when the order reaches the invoicing point; null when not due / not yet built. */
export async function issueInvoiceIfDue(orderId: string, ctx?: ServiceContext): Promise<{ invoiceId: string; number: string } | null> {
  // STUB(contracts): payments team issues invoices from number_series (+ e-invoice submission, CI-00x).
  stubWarn("payments.issueInvoiceIfDue");
  void orderId;
  void ctx;
  return null;
}

/** Real read of the order's payment ledger. */
export async function getPaymentSummary(orderId: string, ctx?: ServiceContext): Promise<PaymentSummary> {
  const rows = await dbOf(ctx)
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, orderId)))
    .orderBy(asc(payments.occurredAt), asc(payments.id));
  const paidAmount = rows
    .filter((r) => r.status === "succeeded" && (r.kind === "capture" || r.kind === "cash"))
    .reduce((s, r) => s + r.amount, 0);
  return {
    orderId,
    paidAmount,
    lastStatus: rows.at(-1)?.status ?? null,
    events: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      method: r.method,
      provider: r.provider,
      amount: r.amount,
      failureCode: r.failureCode,
      occurredAt: r.occurredAt,
    })),
  };
}
