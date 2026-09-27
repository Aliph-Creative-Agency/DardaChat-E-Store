/**
 * PUBLIC contract of `payments` (team PAYMENTS): VAT rate + totals (real), webhook signature (real), payment summary
 * (real read). STUB(contracts): initiatePayment, handleProviderWebhook processing, refund, issueInvoiceIfDue.
 */
export {
  computeTotals,
  getActiveVatRate,
  getPaymentSummary,
  handleProviderWebhook,
  initiatePayment,
  issueInvoiceIfDue,
  refund,
  verifyWebhookSignature,
} from "./service";
export type {
  ComputeTotalsInput,
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentEventView,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  PaymentSummary,
  RefundInput,
  Totals,
  TotalsLineInput,
  WebhookResult,
} from "./types";
