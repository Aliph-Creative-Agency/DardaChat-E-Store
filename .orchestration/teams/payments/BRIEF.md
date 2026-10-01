# Team PAYMENTS — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/payments` (branch `team/payments`). DB 54325, web 3005.
**Owns:** `web/src/modules/payments/**`, `web/src/modules/invoicing/**`, `web/src/modules/pricing/**`,
`web/src/app/[locale]/admin/payments/**`, `web/src/app/[locale]/admin/invoices/**`, `web/src/app/[locale]/admin/settings/tax/**`,
`web/src/app/api/payments/**`, `web/src/app/api/webhooks/**`, `web/src/app/dev/psp/**`, `web/src/app/dev/tax-authority/**`,
`web/messages/*/payments.json`, `web/messages/*/invoicing.json`, `web/tests/e2e/payments/**`.
**SRS:** §4.4 FR-PAY-001..016, §4.3 FR-CRT-007/009 (totals — use `lib/vat.ts`; CR to PLATFORM if it needs changing),
§4.6 FR-ORD-006, 018..020, 023..025, §4.13 FR-CUR-001..006, CI-002, NFR-AVL-005, NFR-SEC-011, Appendix A.3/A.4, §5.2
Invoice/CreditNote/CashRemittance.

**Build:** payment state machine side (A.3/A.4) with a provider-neutral PSP adapter + **mock PSP** (`/dev/psp` hosted page:
approve/decline/timeout; card fields live only there), HMAC-signed idempotent webhooks as the only source of truth
(browser return alone never marks paid); card, wallet, instant-transfer methods through the mock; COD rules (zone
eligibility + max order value); refunds full/partial on any method (cumulative ≤ paid), cash/manual refunds on COD;
failure → retry path with cart intact; provider-down message. COD remittances: record, allocate across orders, unallocated
balance, over-allocation refused, reconciliation report by date + remitting party, unreconciled flag after N days + Owner
write-off. Invoicing: issuance trigger exactly per FR-ORD-023 (`issueInvoiceIfDue`, called by orders), gapless invoice and
credit-note series safe under concurrency (prove 100 concurrent → contiguous), credit notes for refunds/write-offs/errors,
**mock tax authority** adapter with submission, clearance, failure + retry + Owner alert (never shown cleared without a
reference), invoice register filterable + CSV export, PDF VAT invoice and packing slip in the customer locale with correct
Arabic shaping (Playwright HTML→PDF). VAT-rate admin with effective dates; orders keep the rate at sale. `computeTotals`
for cart/checkout.
